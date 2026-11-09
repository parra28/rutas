// Rutometro - mapa y perfil de una ruta, sincronizados.
(function () {
  var nodo = document.getElementById("datos-ruta");
  if (!nodo) return;
  var d = JSON.parse(nodo.textContent);
  var perfil = d.perfil || []; // [distancia_m, altitud_m, pendiente_%, lat, lon]

  var mapa = null;
  var linea = null;
  var cursor = null;
  var cursorVisible = false;

  // ------------------------------------------------------------------ mapa
  function montarMapa() {
    var divMapa = document.getElementById("mapa");
    if (!divMapa || typeof L === "undefined") return;

    var capas = {
      "CyclOSM": L.tileLayer("https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", {
        maxZoom: 18, subdomains: "abc",
        attribution: '<a href="https://www.cyclosm.org/">CyclOSM</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
      "OpenStreetMap": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
      "Topográfico": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        maxZoom: 17, subdomains: "abc",
        attribution: 'Mapa: <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) | Datos: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
      "IGN topográfico": L.tileLayer(
        "https://www.ign.es/wmts/mapa-raster?layer=MTN&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}",
        { maxZoom: 18, attribution: '&copy; <a href="https://www.ign.es/">IGN</a> de España' }
      ),
      "Satélite (PNOA)": L.tileLayer(
        "https://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}",
        { maxZoom: 19, attribution: 'Ortofoto PNOA &copy; <a href="https://www.ign.es/">IGN</a> de España' }
      ),
    };

    mapa = L.map(divMapa, { layers: [capas["CyclOSM"]], scrollWheelZoom: false, zoomSnap: 0.25 });
    mapa.on("click", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("mouseout", function () { mapa.scrollWheelZoom.disable(); });

    var estilos = getComputedStyle(document.documentElement);
    var papel = estilos.getPropertyValue("--papel").trim() || "#f4f4f2";
    var tinta = estilos.getPropertyValue("--tinta").trim() || "#0c0c0c";

    var puntos = d.trazado || [];
    L.polyline(puntos, { color: papel, weight: 7, opacity: 0.85, lineJoin: "round" }).addTo(mapa);
    linea = L.polyline(puntos, { color: tinta, weight: 3, lineJoin: "round" }).addTo(mapa);
    function encuadrar() {
      mapa.invalidateSize({ animate: false });
      mapa.fitBounds(linea.getBounds(), { padding: [20, 20] });
    }
    encuadrar();
    // por si las fuentes o las imagenes cambian la altura despues de cargar
    window.addEventListener("load", encuadrar);
    window.addEventListener("resize", encuadrar);

    function icono(clase, html, tam) {
      return L.divIcon({
        className: "",
        html: '<div class="' + clase + '">' + (html || "") + "</div>",
        iconSize: tam || [12, 12],
        iconAnchor: [(tam ? tam[0] : 12) / 2, (tam ? tam[1] : 12) / 2],
      });
    }

    if (d.inicio) L.marker([d.inicio.lat, d.inicio.lon], { icon: icono("marca-mapa marca-inicio"), zIndexOffset: 500 }).addTo(mapa).bindTooltip("Salida");
    if (d.fin) L.marker([d.fin.lat, d.fin.lon], { icon: icono("marca-mapa marca-fin"), zIndexOffset: 500 }).addTo(mapa).bindTooltip("Llegada");

    var totalKm = (d.distancia || 0) / 1000;
    var pasoKm = totalKm > 80 ? 20 : totalKm > 40 ? 10 : totalKm > 15 ? 5 : 2;
    var capaKm = L.layerGroup();
    for (var k = pasoKm; k < totalKm; k += pasoKm) {
      var p = puntoEnKm(k * 1000);
      if (p) L.marker([p[3], p[4]], { icon: icono("km-mapa", k, [24, 16]) }).addTo(capaKm);
    }
    capaKm.addTo(mapa);

    var capaPuntos = null;
    if (d.puntos && d.puntos.length) {
      capaPuntos = L.layerGroup();
      d.puntos.forEach(function (pt) {
        var marca = icono(
          "punto-mapa" + (pt.aviso ? " es-aviso" : ""),
          '<svg viewBox="0 0 24 24" width="14" height="14">' + pt.icono + "</svg>",
          [24, 24]
        );
        L.marker([pt.lat, pt.lon], { icon: marca, zIndexOffset: 700 })
          .addTo(capaPuntos)
          .bindTooltip("<b>" + pt.etiqueta + "</b>" + (pt.texto ? " · " + pt.texto : "") + "<br>km " + String(pt.km).replace(".", ","));
      });
      capaPuntos.addTo(mapa);
    }

    var superpuestas = { "Marcas kilométricas": capaKm };
    if (capaPuntos) superpuestas["Paradas"] = capaPuntos;
    L.control.layers(capas, superpuestas, { position: "topright" }).addTo(mapa);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(mapa);

    cursor = L.marker([0, 0], { icon: icono("cursor-mapa", "", [14, 14]), zIndexOffset: 900, interactive: false });

    linea.on("mouseover mousemove", function (ev) {
      var mejor = 0, mejorD = Infinity;
      for (var i = 0; i < perfil.length; i++) {
        var dist = Math.abs(perfil[i][3] - ev.latlng.lat) + Math.abs(perfil[i][4] - ev.latlng.lng);
        if (dist < mejorD) { mejorD = dist; mejor = i; }
      }
      mostrar(perfil[mejor][0]);
    });
    linea.on("mouseout", ocultar);
  }

  function puntoEnKm(metros) {
    if (perfil.length === 0) return null;
    var lo = 0, hi = perfil.length - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (perfil[mid][0] < metros) lo = mid + 1;
      else hi = mid;
    }
    return perfil[lo];
  }

  // ---------------------------------------------------------------- perfil
  var svg = document.getElementById("perfil");
  if (!svg) { montarMapa(); return; }

  var caja = svg.closest(".hero-perfil");
  var cruz = document.getElementById("perfil-cruz");
  var punto = document.getElementById("perfil-punto");
  var globo = document.getElementById("perfil-globo");

  var W = parseFloat(svg.dataset.w);
  var H = parseFloat(svg.dataset.h);
  var dTotal = parseFloat(svg.dataset.dtotal);
  var base = parseFloat(svg.dataset.base);
  var techo = parseFloat(svg.dataset.alto);

  function X(m) { return (m / dTotal) * W; }
  function Y(e) { return H - ((e - base) / (techo - base)) * H; }

  function formatea(n, dec) {
    return Number(n).toLocaleString("es-ES", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
  }

  function mostrar(metros) {
    if (!svg) return;
    var p = puntoEnKm(metros);
    if (!p) return;
    var x = X(p[0]), y = Y(p[1]);

    cruz.setAttribute("x1", x);
    cruz.setAttribute("x2", x);
    cruz.removeAttribute("hidden");
    punto.setAttribute("cx", x);
    punto.setAttribute("cy", y);
    punto.removeAttribute("hidden");

    var rs = svg.getBoundingClientRect();
    var rc = caja.getBoundingClientRect();
    globo.innerHTML =
      "km " + formatea(p[0] / 1000, 1) + "  ·  " + formatea(p[1]) + " m  ·  " +
      (p[2] > 0 ? "+" : "") + formatea(p[2], 1) + "%";
    globo.style.left = rs.left - rc.left + (x / W) * rs.width + "px";
    globo.style.top = rs.top - rc.top + (y / H) * rs.height + "px";
    globo.hidden = false;

    if (mapa && cursor) {
      if (!cursorVisible) { cursor.addTo(mapa); cursorVisible = true; }
      cursor.setLatLng([p[3], p[4]]);
    }
  }

  function ocultar() {
    if (!svg) return;
    cruz.setAttribute("hidden", "");
    punto.setAttribute("hidden", "");
    globo.hidden = true;
    if (mapa && cursorVisible) { mapa.removeLayer(cursor); cursorVisible = false; }
  }

  function metrosDesdeX(clientX) {
    var rect = svg.getBoundingClientRect();
    var t = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, t)) * dTotal;
  }

  svg.addEventListener("mousemove", function (ev) { mostrar(metrosDesdeX(ev.clientX)); });
  svg.addEventListener("mouseleave", ocultar);
  svg.addEventListener("touchstart", function (ev) { if (ev.touches[0]) mostrar(metrosDesdeX(ev.touches[0].clientX)); }, { passive: true });
  svg.addEventListener("touchmove", function (ev) { if (ev.touches[0]) mostrar(metrosDesdeX(ev.touches[0].clientX)); }, { passive: true });
  svg.addEventListener("touchend", ocultar);

  svg.setAttribute("tabindex", "0");
  var pos = 0;
  svg.addEventListener("keydown", function (ev) {
    var paso = dTotal / 100;
    if (ev.key === "ArrowRight") pos = Math.min(dTotal, pos + paso);
    else if (ev.key === "ArrowLeft") pos = Math.max(0, pos - paso);
    else if (ev.key === "Home") pos = 0;
    else if (ev.key === "End") pos = dTotal;
    else return;
    ev.preventDefault();
    mostrar(pos);
  });
  svg.addEventListener("blur", ocultar);

  montarMapa();
})();
