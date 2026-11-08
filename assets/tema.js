// Rutometro - cambio entre tema claro y oscuro.
(function () {
  var boton = document.getElementById("boton-tema");
  if (!boton) return;
  boton.addEventListener("click", function () {
    var raiz = document.documentElement;
    var actual = raiz.dataset.tema;
    if (!actual) {
      var oscuroSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
      actual = oscuroSistema ? "oscuro" : "claro";
    }
    var nuevo = actual === "oscuro" ? "claro" : "oscuro";
    raiz.dataset.tema = nuevo;
    try { localStorage.setItem("rutometro-tema", nuevo); } catch (e) {}
    document.dispatchEvent(new CustomEvent("rutometro:tema", { detail: nuevo }));
  });
})();
