// Rutometro - tipo de firme de cada tramo de la ruta.
//
// Se declara en la ficha .md por rangos de kilometros:
//
//   terreno:
//     - 0-12,4 | asfalto
//     - 12,4-38 | pista
//     - 38-41 | sendero
//
// Con eso se calcula el porcentaje de cada tipo y se pinta el trazado
// del mapa por tramos.

import { simplify } from "./gpx.mjs";

/** Tipos de firme. Los colores van en el CSS, aqui solo el identificador. */
export const TIPOS_TERRENO = {
  asfalto: { etiqueta: "Asfalto" },
  pista: { etiqueta: "Pista" },
  sendero: { etiqueta: "Sendero" },
  otro: { etiqueta: "Otro firme" },
};

const ALIAS = {
  carretera: "asfalto",
  asfaltado: "asfalto",
  hormigon: "asfalto",
  tierra: "pista",
  gravilla: "pista",
  grava: "pista",
  camino: "pista",
  caminos: "pista",
  zahorra: "pista",
  trialera: "sendero",
  senda: "sendero",
  single: "sendero",
  monte: "sendero",
};

export function normalizarTerreno(bruto) {
  const t = String(bruto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (TIPOS_TERRENO[t]) return t;
  if (ALIAS[t]) return ALIAS[t];
  return null;
}

function aNumero(x) {
  return parseFloat(String(x).trim().replace(",", "."));
}

/**
 * Convierte las lineas de la ficha en tramos con su geometria y calcula
 * el reparto por tipo de firme.
 */
export function resolverTerreno(lineas, localizador, avisar = () => {}) {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return { tramos: [], reparto: [], declarado: 0 };
  }

  const total = localizador.total;
  const crudos = [];

  for (const linea of lineas) {
    const trozos = String(linea)
      .split("|")
      .map((x) => x.trim());
    if (trozos.length < 2) {
      avisar(`tramo de terreno mal escrito, falta el tipo: "${linea}"`);
      continue;
    }
    const rango = trozos[0].split("-").map((x) => x.trim());
    if (rango.length !== 2) {
      avisar(`el tramo "${trozos[0]}" debe ser un rango, por ejemplo 0-12,4`);
      continue;
    }
    const desde = aNumero(rango[0]) * 1000;
    const hasta = aNumero(rango[1]) * 1000;
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) {
      avisar(`no entiendo el rango "${trozos[0]}"`);
      continue;
    }
    if (hasta <= desde) {
      avisar(`el tramo "${trozos[0]}" acaba antes de empezar`);
      continue;
    }
    const tipo = normalizarTerreno(trozos[1]);
    if (!tipo) {
      avisar(
        `tipo de terreno desconocido "${trozos[1]}" ` +
          `(válidos: ${Object.keys(TIPOS_TERRENO).join(", ")})`
      );
      continue;
    }
    crudos.push({
      desde: Math.max(0, desde),
      hasta: Math.min(total, hasta),
      tipo,
      etiqueta: trozos.slice(2).join(" | ").trim(),
    });
  }

  crudos.sort((a, b) => a.desde - b.desde);

  // huecos y solapes
  let cursor = 0;
  const tramos = [];
  for (const t of crudos) {
    if (t.desde < cursor - 1) {
      avisar(
        `los tramos de terreno se solapan en el km ${(t.desde / 1000).toFixed(1)}; ` +
          `se recorta al final del anterior`
      );
      t.desde = cursor;
      if (t.hasta <= t.desde) continue;
    }
    if (t.desde > cursor + 50) {
      // hueco sin declarar
      tramos.push({ desde: cursor, hasta: t.desde, tipo: "otro", sinDeclarar: true });
    }
    tramos.push(t);
    cursor = t.hasta;
  }
  if (cursor < total - 50) {
    tramos.push({ desde: cursor, hasta: total, tipo: "otro", sinDeclarar: true });
  }

  // geometria de cada tramo, simplificada para no inflar la pagina
  const presupuesto = Math.max(40, Math.floor(2500 / Math.max(1, tramos.length)));
  for (const t of tramos) {
    const puntos = localizador.tramo(t.desde, t.hasta);
    let tol = 0.00002;
    let red = simplify(puntos, tol);
    let guarda = 0;
    while (red.length > presupuesto && guarda++ < 24) {
      tol *= 1.7;
      red = simplify(puntos, tol);
    }
    t.metros = Math.round(t.hasta - t.desde);
    t.km = [Math.round(t.desde / 100) / 10, Math.round(t.hasta / 100) / 10];
    t.puntos = red.map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5]);
  }

  // reparto por tipo
  const porTipo = new Map();
  for (const t of tramos) {
    porTipo.set(t.tipo, (porTipo.get(t.tipo) || 0) + t.metros);
  }
  const reparto = [...porTipo.entries()]
    .map(([tipo, metros]) => ({
      tipo,
      etiqueta: TIPOS_TERRENO[tipo].etiqueta,
      metros,
      porcentaje: Math.round((metros / total) * 1000) / 10,
    }))
    .sort((a, b) => b.metros - a.metros);

  const declarado = tramos
    .filter((t) => !t.sinDeclarar)
    .reduce((a, t) => a + t.metros, 0);

  return {
    tramos: tramos.map((t) => ({
      tipo: t.tipo,
      etiqueta: t.etiqueta || "",
      km: t.km,
      metros: t.metros,
      puntos: t.puntos,
      sinDeclarar: !!t.sinDeclarar,
    })),
    reparto,
    declarado,
  };
}
