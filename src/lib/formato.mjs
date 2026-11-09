// Rutometro - formato de numeros y etiquetas en castellano.

// Los iconos son del firme, no de la bici: a tamaño pequeño una carretera
// con su línea discontinua, un carril con grava y una montaña se distinguen
// de un vistazo, y dos siluetas de bicicleta no.
export const TIPOS_BICI = {
  carretera: {
    etiqueta: "Carretera",
    slot: 1,
    icono:
      '<path d="M5 21 9.5 3M19 21 14.5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M12 5.5v3M12 11v3M12 16.5v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  },
  gravel: {
    etiqueta: "Gravel",
    slot: 2,
    icono:
      '<path d="M5 21 9.5 3M19 21 14.5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="12" cy="7" r="1.3" fill="currentColor"/><circle cx="10.6" cy="12.4" r="1.3" fill="currentColor"/>' +
      '<circle cx="13.4" cy="12.4" r="1.3" fill="currentColor"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/>',
  },
  btt: {
    etiqueta: "MTB",
    slot: 3,
    icono: '<path d="M2 20 8.6 7.5 12.4 14 15 9.8 22 20Z" fill="currentColor"/>',
  },
  cicloturismo: {
    etiqueta: "Cicloturismo",
    slot: 4,
    icono:
      '<circle cx="6" cy="16" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="18" cy="16" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M6 16l4-8h5l3 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  },
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
