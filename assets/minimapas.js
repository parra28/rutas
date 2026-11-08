// Rutometro - convierte la silueta de cada tarjeta en un mapa de verdad.
// Mejora progresiva: el HTML ya trae el trazado en SVG, asi que la pagina
// se ve bien al instante y tambien sin JavaScript. El mapa se monta encima
// solo cuando la tarjeta entra en pantalla, para no pedir teselas de rutas
// que nadie va a mirar.
(function () {
  var nodo = document.getElementById("datos-mapas");
  if (!nodo || typeof L === "undefined" || !("IntersectionObserver" in window)) return;

  var datos;
  try { datos = JSON.parse(nodo.textContent); } catch (e) { return; }

  var acento = getComputedStyle(document.documentElement).getPropertyValue("--acento").trim() || "#2a78d6";

  function montar(caja) {
    var trazado = datos[caja.dataset.slug];
    if (!trazado || trazado.length < 2) return;

    var lienzo = document.createElement("div");
    lienzo.className = "minimapa";
    caja.appendChild(lienzo);

    var mapa = L.map(lienzo, {
      attributionControl: false, // el credito va una sola vez al pie de la rejilla
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.25,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17 }).addTo(mapa);
    L.polyline(trazado, { color: "#ffffff", weight: 5, opacity: 0.8, lineJoin: "round" }).addTo(mapa);
    var linea = L.polyline(trazado, { color: acento, weight: 2.5, lineJoin: "round" }).addTo(mapa);
    mapa.fitBounds(linea.getBounds(), { padding: [10, 10] });

    caja.classList.add("con-mapa");
  }

  var vigia = new IntersectionObserver(
    function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        vigia.unobserve(e.target);
        montar(e.target);
      });
    },
    { rootMargin: "300px" }
  );

  Array.prototype.forEach.call(document.querySelectorAll(".tarjeta-trazo[data-slug]"), function (c) {
    if (datos[c.dataset.slug]) vigia.observe(c);
  });
})();
