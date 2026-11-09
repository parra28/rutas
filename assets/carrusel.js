// Rutometro - deslizable de cada fila: perfil, mapa y fotos.
// El mapa no se monta hasta que alguien se desliza hasta el, asi que la
// portada no pide una sola tesela mientras nadie la pida.
(function () {
  var carruseles = Array.prototype.slice.call(document.querySelectorAll(".carrusel"));
  if (carruseles.length === 0) return;

  var datos = null;
  var nodo = document.getElementById("datos-mapas");
  if (nodo) { try { datos = JSON.parse(nodo.textContent); } catch (e) {} }

  carruseles.forEach(function (c) {
    var pista = c.querySelector(".carrusel-pista");
    var diapos = Array.prototype.slice.call(c.querySelectorAll(".diapo"));
    var tabs = Array.prototype.slice.call(c.querySelectorAll(".carrusel-tab"));
    var montado = false;

    function marcar(i) {
      tabs.forEach(function (t, j) {
        t.classList.toggle("activo", j === i);
        t.setAttribute("aria-selected", j === i ? "true" : "false");
      });
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        pista.scrollTo({ left: diapos[i].offsetLeft - pista.offsetLeft, behavior: "smooth" });
        marcar(i);
      });
    });

    // seguir el desplazamiento para saber que diapositiva se esta viendo
    var pendiente = null;
    pista.addEventListener("scroll", function () {
      // oculto por un filtro: el ancho es cero y la cuenta no vale nada
      if (!pista.clientWidth) return;
      if (pendiente) return;
      pendiente = requestAnimationFrame(function () {
        pendiente = null;
        if (!pista.clientWidth) return;
        var i = Math.round(pista.scrollLeft / pista.clientWidth);
        marcar(Math.max(0, Math.min(diapos.length - 1, i)));
      });
    }, { passive: true });

    // Al filtrar, las filas se ocultan y se vuelven a mostrar: el navegador
    // pierde la posicion del deslizable y las pestañas se quedaban mintiendo.
    c.volverAlInicio = function () {
      pista.scrollLeft = 0;
      marcar(0);
    };

    // El mapa es la vista por defecto, asi que se monta en cuanto la fila
    // asoma por la pantalla, no al deslizar.
    if ("IntersectionObserver" in window) {
      var vigia = new IntersectionObserver(
        function (entradas) {
          entradas.forEach(function (e) {
            if (!e.isIntersecting) return;
            vigia.unobserve(e.target);
            montarMapa();
          });
        },
        { rootMargin: "300px" }
      );
      vigia.observe(c);
    } else {
      montarMapa();
    }

    function montarMapa() {
      if (montado || typeof L === "undefined" || !datos) return;
      var lienzo = c.querySelector(".minimapa");
      if (!lienzo) return;
      var trazado = datos[lienzo.dataset.slug];
      if (!trazado || trazado.length < 2) return;
      montado = true;

      var estilos = getComputedStyle(document.documentElement);
      var mapa = L.map(lienzo, {
        attributionControl: false,
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
      L.polyline(trazado, {
        color: estilos.getPropertyValue("--papel").trim() || "#f4f4f2",
        weight: 6, opacity: 0.85, lineJoin: "round",
      }).addTo(mapa);
      var linea = L.polyline(trazado, {
        color: estilos.getPropertyValue("--tinta").trim() || "#0c0c0c",
        weight: 2.5, lineJoin: "round",
      }).addTo(mapa);
      mapa.fitBounds(linea.getBounds(), { padding: [12, 12] });
      setTimeout(function () {
        mapa.invalidateSize({ animate: false });
        mapa.fitBounds(linea.getBounds(), { padding: [12, 12] });
      }, 60);
    }
  });

  document.addEventListener("rutometro:filtrado", function () {
    carruseles.forEach(function (c) {
      if (c.volverAlInicio) c.volverAlInicio();
    });
  });
})();
