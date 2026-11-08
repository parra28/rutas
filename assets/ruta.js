// Rutometro - mapa y perfil de altimetria de una ruta, sincronizados.
(function () {
  var nodo = document.getElementById("datos-ruta");
  if (!nodo) return;

  var d = JSON.parse(nodo.textContent);
  // perfil: [distancia_m, altitud_m, pendiente_%, lat, lon]
  var perfil = d.perfil || [];

  var mapa = null;
  var linea = null;
  var cursor = null;
  var cursorVisible = false;

  // ------------------------------------------------------------------ mapa
  // Si Leaflet no esta disponible, el perfil sigue funcionando igual.
  function montarMapa() {
  var divMapa = document.getElementById("mapa");
  if (!divMapa || typeof L === "undefined") return;

  var capas = {
    "CyclOSM (ciclismo)": L.tileLayer(
      "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        subdomains: "abc",
        attribution:
          '<a href="https://www.cyclosm.org/">CyclOSM</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ),
    "OpenStreetMap": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }),
    "Topográfico": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      subdomains: "abc",
      attribution:
        'Mapa: <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) | Datos: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

  mapa = L.map(divMapa, {
    layers: [capas["CyclOSM (ciclismo)"]],
    scrollWheelZoom: false, // se activa al hacer clic: evita capturar el scroll de la pagina
  });
  mapa.on("click", function () { mapa.scrollWheelZoom.enable(); });
  mapa.on("mouseout", function () { mapa.scrollWheelZoom.disable(); });

  var superpuestas = {};
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(mapa);

  // trazado: una linea blanca ancha debajo para que resalte sobre cualquier mapa
  var puntos = d.trazado || [];
  var estilos = getComputedStyle(document.documentElement);
  L.polyline(puntos, { color: "#ffffff", weight: 7, opacity: 0.75, lineJoin: "round" }).addTo(mapa);
  linea = L.polyline(puntos, {
    color: estilos.getPropertyValue("--acento").trim() || "#2a78d6",
    weight: 4,
    opacity: 1,
    lineJoin: "round",
  }).addTo(mapa);

  mapa.fitBounds(linea.getBounds(), { padding: [24, 24] });

  function icono(clase, html) {
    return L.divIcon({
      className: "",
      html: '<div class="' + clase + '">' + (html || "") + "</div>",
      iconSize: clase === "marca-km" ? [26, 16] : [14, 14],
      iconAnchor: clase === "marca-km" ? [13, 8] : [7, 7],
    });
  }

  if (d.inicio) {
    L.marker([d.inicio.lat, d.inicio.lon], { icon: icono("marca-mapa marca-inicio"), zIndexOffset: 500 })
      .addTo(mapa)
      .bindTooltip("Salida");
  }
  if (d.fin) {
    L.marker([d.fin.lat, d.fin.lon], { icon: icono("marca-mapa marca-fin"), zIndexOffset: 500 })
      .addTo(mapa)
      .bindTooltip("Llegada");
  }

  // marcas kilometricas: cada 5 km si la ruta es corta, cada 10 si es larga
  var totalKm = (d.distancia || 0) / 1000;
  var pasoKm = totalKm > 80 ? 20 : totalKm > 40 ? 10 : totalKm > 15 ? 5 : 2;
  var capaKm = L.layerGroup();
  for (var k = pasoKm; k < totalKm; k += pasoKm) {
    var p = puntoEnKm(k * 1000);
    if (p) L.marker([p[3], p[4]], { icon: icono("marca-km", k) }).addTo(capaKm);
  }
  capaKm.addTo(mapa);

  // puntos de interes: fuentes, bares, tiendas, avisos...
  var capaPuntos = null;
  if (d.puntos && d.puntos.length) {
    capaPuntos = L.layerGroup();
    d.puntos.forEach(function (pt) {
      var marca = L.divIcon({
        className: "",
        html:
          '<div class="punto-mapa' + (pt.aviso ? " es-aviso" : "") + '">' +
          '<svg viewBox="0 0 24 24" width="15" height="15">' + pt.icono + "</svg></div>",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([pt.lat, pt.lon], { icon: marca, zIndexOffset: 700 })
        .addTo(capaPuntos)
        .bindTooltip(
          "<b>" + pt.etiqueta + "</b>" + (pt.texto ? " · " + pt.texto : "") +
            '<br><span class="tt-km">km ' + String(pt.km).replace(".", ",") + "</span>"
        );
    });
    capaPuntos.addTo(mapa);
  }

  // selector de capas: las bases, y las marcas y los puntos como superpuestas
  superpuestas["Marcas kilométricas"] = capaKm;
  if (capaPuntos) superpuestas["Puntos de interés"] = capaPuntos;
  L.control.layers(capas, superpuestas, { position: "topright" }).addTo(mapa);

  cursor = L.marker([0, 0], { icon: icono("cursor-mapa"), zIndexOffset: 900, interactive: false });

  // del mapa al perfil: al pasar por la linea, se marca el punto del perfil
  linea.on("mouseover mousemove", function (ev) {
    var mejor = 0;
    var mejorD = Infinity;
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
    var lo = 0;
    var hi = perfil.length - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (perfil[mid][0] < metros) lo = mid + 1;
      else hi = mid;
    }
    return perfil[lo];
  }

  // ---------------------------------------------------------------- perfil

  var svg = document.getElementById("perfil");
  if (!svg) {
    // Ruta sin datos de altitud: se monta el mapa y no hay nada mas que hacer.
    montarMapa();
    return;
  }

  var envoltorio = svg.parentElement;
  var cruz = document.getElementById("perfil-cruz");
  var punto = document.getElementById("perfil-punto");
  var globo = document.getElementById("perfil-globo");

  var vb = svg.viewBox.baseVal;
  var padIzq = parseFloat(svg.dataset.padizq);
  var padDer = parseFloat(svg.dataset.padder);
  var padArr = parseFloat(svg.dataset.padarr);
  var padAba = parseFloat(svg.dataset.padaba);
  var eMin = parseFloat(svg.dataset.emin);
  var eMax = parseFloat(svg.dataset.emax);
  var dTotal = parseFloat(svg.dataset.dtotal);
  var anchoUtil = vb.width - padIzq - padDer;
  var altoUtil = vb.height - padArr - padAba;

  function X(metros) { return padIzq + (metros / dTotal) * anchoUtil; }
  function Y(ele) { return padArr + altoUtil - ((ele - eMin) / (eMax - eMin)) * altoUtil; }

  function formatea(n, dec) {
    return Number(n).toLocaleString("es-ES", {
      minimumFractionDigits: dec || 0,
      maximumFractionDigits: dec || 0,
    });
  }

  function mostrar(metros) {
    if (!svg) return;
    var p = puntoEnKm(metros);
    if (!p) return;
    var x = X(p[0]);
    var y = Y(p[1]);

    cruz.setAttribute("x1", x);
    cruz.setAttribute("x2", x);
    cruz.removeAttribute("hidden");
    punto.setAttribute("cx", x);
    punto.setAttribute("cy", y);
    punto.removeAttribute("hidden");

    var rectSvg = svg.getBoundingClientRect();
    var rectEnv = envoltorio.getBoundingClientRect();
    globo.innerHTML =
      "<b>km " + formatea(p[0] / 1000, 1) + "</b> · " +
      formatea(p[1]) + " m · " +
      (p[2] > 0 ? "+" : "") + formatea(p[2], 1) + "%";
    globo.style.left = (rectSvg.left - rectEnv.left + (x / vb.width) * rectSvg.width) + "px";
    globo.style.top = (rectSvg.top - rectEnv.top + (y / vb.height) * rectSvg.height) + "px";
    globo.hidden = false;

    if (mapa && cursor) {
      if (!cursorVisible) {
        cursor.addTo(mapa);
        cursorVisible = true;
      }
      cursor.setLatLng([p[3], p[4]]);
    }
  }

  function ocultar() {
    if (!svg) return;
    cruz.setAttribute("hidden", "");
    punto.setAttribute("hidden", "");
    globo.hidden = true;
    if (mapa && cursorVisible) {
      mapa.removeLayer(cursor);
      cursorVisible = false;
    }
  }

  function metrosDesdeX(clientX) {
    var rect = svg.getBoundingClientRect();
    var vbX = ((clientX - rect.left) / rect.width) * vb.width;
    var t = (vbX - padIzq) / anchoUtil;
    return Math.max(0, Math.min(1, t)) * dTotal;
  }

  svg.addEventListener("mousemove", function (ev) { mostrar(metrosDesdeX(ev.clientX)); });
  svg.addEventListener("mouseleave", ocultar);
  svg.addEventListener(
    "touchstart",
    function (ev) { if (ev.touches[0]) mostrar(metrosDesdeX(ev.touches[0].clientX)); },
    { passive: true }
  );
  svg.addEventListener(
    "touchmove",
    function (ev) { if (ev.touches[0]) mostrar(metrosDesdeX(ev.touches[0].clientX)); },
    { passive: true }
  );
  svg.addEventListener("touchend", ocultar);

  // navegacion con teclado: flechas sobre el perfil
  svg.setAttribute("tabindex", "0");
  var posTeclado = 0;
  svg.addEventListener("keydown", function (ev) {
    var paso = dTotal / 100;
    if (ev.key === "ArrowRight") posTeclado = Math.min(dTotal, posTeclado + paso);
    else if (ev.key === "ArrowLeft") posTeclado = Math.max(0, posTeclado - paso);
    else if (ev.key === "Home") posTeclado = 0;
    else if (ev.key === "End") posTeclado = dTotal;
    else return;
    ev.preventDefault();
    mostrar(posTeclado);
  });
  svg.addEventListener("blur", ocultar);

  montarMapa();
})();
