// Rutometro - formato de numeros y etiquetas en castellano.

export const TIPOS_BICI = {
  carretera: { etiqueta: "Carretera", slot: 1 },
  gravel: { etiqueta: "Gravel", slot: 2 },
  btt: { etiqueta: "MTB", slot: 3 },
  cicloturismo: { etiqueta: "Cicloturismo", slot: 4 },
};

/** Nombres alternativos que se aceptan en la ficha. */
export const ALIAS_BICI = { mtb: "btt", btt: "btt", montana: "btt", road: "carretera", ruta: "carretera" };

export const TIPOS_RECORRIDO = {
  circular: "Circular",
  lineal: "Lineal",
  "ida-vuelta": "Ida y vuelta",
};

export const DIFICULTADES = {
  1: "Muy fácil",
  2: "Fácil",
  3: "Moderada",
  4: "Difícil",
  5: "Muy difícil",
};

/** 42350 m -> "42,4" */
export function km(metros, decimales = 1) {
  const v = metros / 1000;
  return v.toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** 1234 -> "1.234" */
export function entero(n) {
  return Math.round(n).toLocaleString("es-ES");
}

/** 7.4 -> "7,4" */
export function decimal(n, d = 1) {
  return Number(n).toLocaleString("es-ES", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/** 9240 -> "2 h 34 min" */
export function duracion(segundos) {
  if (!segundos || segundos <= 0) return null;
  const h = Math.floor(segundos / 3600);
  const m = Math.round((segundos % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Fecha ISO -> "12 de marzo de 2026" */
export function fechaLarga(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
