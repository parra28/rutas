// Rutometro - miniatura SVG del trazado, generada en el build.
// Es la "cara" de cada ruta en el listado: sin fotos, la silueta del
// recorrido es lo que la hace reconocible.

/**
 * Devuelve un SVG inline con el trazado de la ruta.
 * puntos: [[lat, lon], ...]
 */
export function miniatura(puntos, { ancho = 320, alto = 150, margen = 12 } = {}) {
  if (!puntos || puntos.length < 2) return "";

  // proyeccion equirectangular corregida por latitud: suficiente a esta escala
  const latMid = puntos.reduce((a, p) => a + p[0], 0) / puntos.length;
  const k = Math.cos((latMid * Math.PI) / 180);
  const pts = puntos.map((p) => [p[1] * k, p[0]]);

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const [x, y] of pts) {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }

  const w = ancho - margen * 2;
  const h = alto - margen * 2;
  const dx = xMax - xMin || 1e-9;
  const dy = yMax - yMin || 1e-9;
  const escala = Math.min(w / dx, h / dy);
  const offX = margen + (w - dx * escala) / 2;
  const offY = margen + (h - dy * escala) / 2;

  // reducimos puntos: una miniatura no necesita mas de ~200
  const paso = Math.max(1, Math.ceil(pts.length / 200));
  const d = [];
  for (let i = 0; i < pts.length; i += paso) {
    const x = offX + (pts[i][0] - xMin) * escala;
    const y = offY + (yMax - pts[i][1]) * escala; // y invertida
    d.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const ult = pts[pts.length - 1];
  d.push(
    `L${(offX + (ult[0] - xMin) * escala).toFixed(1)} ${(offY + (yMax - ult[1]) * escala).toFixed(1)}`
  );

  const inicio = [
    offX + (pts[0][0] - xMin) * escala,
    offY + (yMax - pts[0][1]) * escala,
  ];

  return [
    `<svg class="trazo" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Trazado de la ruta" preserveAspectRatio="xMidYMid meet">`,
    `<path d="${d.join(" ")}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="${inicio[0].toFixed(1)}" cy="${inicio[1].toFixed(1)}" r="4" fill="currentColor"/>`,
    `</svg>`,
  ].join("");
}
