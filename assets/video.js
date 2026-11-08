// Rutometro - carga el video solo cuando el visitante lo pide.
(function () {
  var caja = document.getElementById("video");
  if (!caja) return;
  var boton = caja.querySelector(".video-boton");
  if (!boton) return;

  boton.addEventListener("click", function () {
    var marco = document.createElement("iframe");
    marco.src = caja.dataset.incrustar;
    marco.title = "Vídeo de la ruta en " + caja.dataset.plataforma;
    marco.loading = "lazy";
    marco.allow = "encrypted-media; picture-in-picture; fullscreen";
    marco.allowFullscreen = true;
    marco.referrerPolicy = "strict-origin-when-cross-origin";
    caja.querySelector(".video-marco").replaceChildren(marco);
    caja.classList.add("cargado");
  });
})();
