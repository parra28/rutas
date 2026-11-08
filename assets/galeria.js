// Rutometro - visor de fotos a pantalla completa.
(function () {
  var galeria = document.getElementById("galeria");
  var visor = document.getElementById("visor");
  if (!galeria || !visor) return;

  var botones = Array.prototype.slice.call(galeria.querySelectorAll(".galeria-item"));
  var img = document.getElementById("visor-img");
  var pie = document.getElementById("visor-pie");
  var cerrar = document.getElementById("visor-cerrar");
  var antes = document.getElementById("visor-antes");
  var despues = document.getElementById("visor-despues");
  var actual = 0;
  var ultimoFoco = null;

  function pintar(i) {
    actual = (i + botones.length) % botones.length;
    var origen = botones[actual].querySelector("img");
    img.src = origen.src;
    img.alt = origen.alt || "";
    pie.textContent = origen.alt || "";
    pie.hidden = !origen.alt;
    var unaSola = botones.length < 2;
    antes.hidden = unaSola;
    despues.hidden = unaSola;
  }

  function abrir(i) {
    ultimoFoco = document.activeElement;
    pintar(i);
    visor.hidden = false;
    document.body.style.overflow = "hidden";
    cerrar.focus();
  }

  function ocultar() {
    visor.hidden = true;
    document.body.style.overflow = "";
    img.src = "";
    if (ultimoFoco) ultimoFoco.focus();
  }

  botones.forEach(function (b, i) {
    b.addEventListener("click", function () { abrir(i); });
  });
  cerrar.addEventListener("click", ocultar);
  antes.addEventListener("click", function () { pintar(actual - 1); });
  despues.addEventListener("click", function () { pintar(actual + 1); });
  visor.addEventListener("click", function (ev) {
    if (ev.target === visor) ocultar();
  });

  document.addEventListener("keydown", function (ev) {
    if (visor.hidden) return;
    if (ev.key === "Escape") ocultar();
    else if (ev.key === "ArrowLeft") pintar(actual - 1);
    else if (ev.key === "ArrowRight") pintar(actual + 1);
  });

  // arrastre lateral en movil
  var x0 = null;
  visor.addEventListener("touchstart", function (ev) {
    x0 = ev.touches[0] ? ev.touches[0].clientX : null;
  }, { passive: true });
  visor.addEventListener("touchend", function (ev) {
    if (x0 === null || !ev.changedTouches[0]) return;
    var dx = ev.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) pintar(actual + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
})();
