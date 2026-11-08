// Rutometro - filtros y orden del listado.
// Las tarjetas ya vienen en el HTML: aqui solo se muestran, se ocultan
// y se reordenan. Asi la pagina funciona tambien sin JavaScript.
(function () {
  var rejilla = document.getElementById("rejilla");
  if (!rejilla) return;

  var tarjetas = Array.prototype.slice.call(rejilla.querySelectorAll(".tarjeta"));
  var buscar = document.getElementById("f-buscar");
  var zona = document.getElementById("f-zona");
  var dist = document.getElementById("f-dist");
  var dplus = document.getElementById("f-dplus");
  var dif = document.getElementById("f-dif");
  var orden = document.getElementById("f-orden");
  var contador = document.getElementById("contador");
  var vacio = document.getElementById("vacio");
  var limpiar = document.getElementById("limpiar");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var biciActiva = "";

  function normalizar(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function num(t, attr) {
    return parseFloat(t.dataset[attr]) || 0;
  }

  var comparadores = {
    reciente: function (a, b) { return num(a, "orden") - num(b, "orden"); },
    "dist-desc": function (a, b) { return num(b, "dist") - num(a, "dist"); },
    "dist-asc": function (a, b) { return num(a, "dist") - num(b, "dist"); },
    "dplus-desc": function (a, b) { return num(b, "dplus") - num(a, "dplus"); },
    "dureza-desc": function (a, b) {
      return num(b, "dplus") / (num(b, "dist") || 1) - num(a, "dplus") / (num(a, "dist") || 1);
    },
    nombre: function (a, b) {
      return (a.dataset.nombre || "").localeCompare(b.dataset.nombre || "", "es");
    },
  };

  function aplicar() {
    var texto = normalizar(buscar && buscar.value);
    var zonaSel = zona ? zona.value : "";
    var maxDist = dist && dist.value ? parseFloat(dist.value) * 1000 : Infinity;
    var maxD = dplus && dplus.value ? parseFloat(dplus.value) : Infinity;
    var maxDif = dif && dif.value ? parseFloat(dif.value) : Infinity;
    var visibles = 0;

    tarjetas.forEach(function (t) {
      var ok = true;
      if (texto && normalizar(t.dataset.busqueda).indexOf(texto) === -1) ok = false;
      if (ok && zonaSel && t.dataset.zona !== zonaSel) ok = false;
      if (ok && biciActiva && t.dataset.bici !== biciActiva) ok = false;
      if (ok && num(t, "dist") > maxDist) ok = false;
      if (ok && num(t, "dplus") > maxD) ok = false;
      if (ok && maxDif !== Infinity) {
        var d = num(t, "dif");
        if (d === 0 || d > maxDif) ok = false;
      }
      t.hidden = !ok;
      if (ok) visibles++;
    });

    var cmp = comparadores[orden ? orden.value : "reciente"] || comparadores.reciente;
    tarjetas.slice().sort(cmp).forEach(function (t) { rejilla.appendChild(t); });

    if (contador) {
      contador.textContent =
        visibles === tarjetas.length
          ? tarjetas.length + (tarjetas.length === 1 ? " ruta" : " rutas")
          : visibles + " de " + tarjetas.length + " rutas";
    }
    if (vacio) vacio.hidden = visibles !== 0;
  }

  [buscar, zona, dist, dplus, dif, orden].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", aplicar);
    el.addEventListener("change", aplicar);
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      biciActiva = chip.dataset.bici || "";
      chips.forEach(function (c) { c.classList.toggle("activo", c === chip); });
      aplicar();
    });
  });

  if (limpiar) {
    limpiar.addEventListener("click", function () {
      if (buscar) buscar.value = "";
      [zona, dist, dplus, dif].forEach(function (s) { if (s) s.value = ""; });
      biciActiva = "";
      chips.forEach(function (c, i) { c.classList.toggle("activo", i === 0); });
      aplicar();
    });
  }

  aplicar();
})();
