// Rutometro - video incrustado en la ficha de una ruta.
//
// En la ficha:  video: https://www.instagram.com/reel/XXXXXXXX/
//
// No se carga nada de fuera hasta que el visitante pulsa: la pagina
// muestra primero un boton y solo entonces se inserta el iframe. Asi la
// ficha no pide nada a Instagram ni a YouTube solo por abrirla.

/**
 * Reconoce la URL y devuelve de donde es y como incrustarla.
 * Devuelve null si no se reconoce la plataforma.
 */
export function analizarVideo(url) {
  if (!url) return null;
  const limpia = String(url).trim();

  let m = limpia.match(/instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) {
    const tipo = m[1].toLowerCase() === "p" ? "p" : "reel";
    return {
      plataforma: "Instagram",
      enlace: `https://www.instagram.com/${tipo}/${m[2]}/`,
      // Instagram no ofrece ningún parámetro de autoplay en su incrustado:
      // su reproductor arranca con un toque dentro del propio iframe.
      incrustar: `https://www.instagram.com/${tipo}/${m[2]}/embed/`,
      vertical: true,
    };
  }

  m = limpia.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (m) {
    const corto = /shorts\//i.test(limpia);
    return {
      plataforma: "YouTube",
      enlace: `https://www.youtube.com/watch?v=${m[1]}`,
      // Como el iframe solo se crea al pulsar, el navegador acepta el
      // autoplay: hay gesto del usuario. Silenciado, por si acaso.
      incrustar: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&mute=1&rel=0`,
      vertical: corto,
    };
  }

  return null;
}
