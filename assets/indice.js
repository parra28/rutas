// Rutometro - buscador, filtros y orden del listado.
// Las filas ya vienen en el HTML: aqui solo se muestran, se ocultan y se
// reordenan, asi que la pagina tambien funciona sin JavaScript.
(function () {
  var rejilla = document.getElementById("rejilla");
  if (!rejilla) return;

  var filas = Array.prototype.slice.call(rejilla.querySelectorAll(".ruta-fila"));
  var buscar = document.getElementById("f-buscar");
  var zona = document.getElementById("f-zona");
  var dist = document.getElementById("f-dist");
  var dplus = document.getElementById("f-dplus");
  var dif = document.getElementById("f-dif");
  var contador = document.getElementById("contador");
  var vacio = document.getElementById("vacio");
  var limpiar = document.getElementById("limpiar");
  var chipsBici = Array.prototype.slice.call(document.querySelectorAll(".chip[data-bici]"));
  var chipsOrden = Array.prototype.slice.call(document.querySelectorAll(".chip[data-orden]"));
  var bici = "";
  var orden = "reciente";

  function normalizar(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function num(t, attr) {
    return parseFloat(t.dataset[attr]) || 0;
  }

  var comparadores = {
    reciente: function (a, b) { return num(a, "orden") - num(b, "orden"); },
    "dist-desc": function (a, b) { return num(b, "dist") - num(a, "dist"); },
    "dplus-desc": function (a, b) { return num(b, "dplus") - num(a, "dplus"); },
  };

  function aplicar() {
    var texto = normalizar(buscar && buscar.value);
    var zonaSel = zona ? zona.value : "";
    var maxDist = dist && dist.value ? parseFloat(dist.value) * 1000 : Infinity;
    var maxD = dplus && dplus.value ? parseFloat(dplus.value) : Infinity;
    var maxDif = dif && dif.value ? parseFloat(dif.value) : Infinity;
    var visibles = 0;

    filas.forEach(function (t) {
      var ok = true;
      if (texto && normalizar(t.dataset.busqueda).indexOf(texto) === -1) ok = false;
      if (ok && zonaSel && t.dataset.zona !== zonaSel) ok = false;
      if (ok && bici && t.dataset.bici !== bici) ok = false;
      if (ok && num(t, "dist") > maxDist) ok = false;
      if (ok && num(t, "dplus") > maxD) ok = false;
      if (ok && maxDif !== Infinity) {
        var d = num(t, "dif");
        if (d === 0 || d > maxDif) ok = false;
      }
      t.hidden = !ok;
      if (ok) visibles++;
    });

    var cmp = comparadores[orden] || comparadores.reciente;
    filas.slice().sort(cmp).forEach(function (t) { rejilla.appendChild(t); });

    // la numeracion sigue a lo que se ve
    var n = 0;
    filas.forEach(function (t) {
      if (t.hidden) return;
      n++;
      var marca = t.querySelector(".ruta-num");
      if (marca) marca.textContent = n < 10 ? "0" + n : String(n);
    });

    if (contador) {
      contador.textContent =
        visibles === filas.length
          ? filas.length + (filas.length === 1 ? " ruta" : " rutas")
          : visibles + " de " + filas.length + " rutas";
    }
    if (vacio) vacio.hidden = visibles !== 0;

    // los deslizables vuelven a su primera vista: si no, las pestañas se
    // quedan marcando una diapositiva que ya no es la que se ve
    document.dispatchEvent(new CustomEvent("rutometro:filtrado"));
  }

  [buscar, zona, dist, dplus, dif].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", aplicar);
    el.addEventListener("change", aplicar);
  });

  chipsBici.forEach(function (c) {
    c.addEventListener("click", function () {
      bici = c.dataset.bici || "";
      chipsBici.forEach(function (x) { x.classList.toggle("activo", x === c); });
      aplicar();
    });
  });
  chipsOrden.forEach(function (c) {
    c.addEventListener("click", function () {
      orden = c.dataset.orden;
      chipsOrden.forEach(function (x) { x.classList.toggle("activo", x === c); });
      aplicar();
    });
  });

  if (limpiar) {
    limpiar.addEventListener("click", function () {
      if (buscar) buscar.value = "";
      [zona, dist, dplus, dif].forEach(function (s) { if (s) s.value = ""; });
      bici = "";
      orden = "reciente";
      chipsBici.forEach(function (x, i) { x.classList.toggle("activo", i === 0); });
      chipsOrden.forEach(function (x, i) { x.classList.toggle("activo", i === 0); });
      aplicar();
    });
  }

  aplicar();
})();
