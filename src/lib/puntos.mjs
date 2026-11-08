// Rutometro - puntos de interes de una ruta: fuentes, bares, tiendas...
//
// Se escriben en la ficha .md por kilometro, que es lo comodo:
//
//   puntos:
//     - 0 | parking | Aparcamiento de la Venta
//     - 14,2 | fuente | Fuente del pueblo, potable
//     - 38 | desayuno | Bar de la plaza, abre a las 8
//
// Tambien vale dar coordenadas en lugar del kilometro:
//
//     - 38.0258,-6.2197 | mirador | Vistas de toda la sierra

/** Tipos reconocidos, con su etiqueta y su icono. */
export const TIPOS_PUNTO = {
  parking: {
    etiqueta: "Aparcamiento",
    icono: '<path d="M9 18V6h4a4 4 0 0 1 0 8H9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  fuente: {
    etiqueta: "Agua",
    icono: '<path d="M12 3.5s5.5 6.6 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 10.1 12 3.5 12 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  },
  desayuno: {
    etiqueta: "Desayuno o bar",
    icono: '<path d="M4.5 7.5h11v5.5a5.5 5.5 0 0 1-11 0zM15.5 9H17a2.2 2.2 0 0 1 0 4.4h-1.5M3.5 20.5h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  comida: {
    etiqueta: "Comida",
    icono: '<path d="M6.5 3.5v7.5a2.5 2.5 0 0 0 5 0V3.5M9 3.5V11M17.5 3.5c-1.4 1-2 2.6-2 4.3 0 1.4.7 2.2 2 2.2zM17.5 10v10.5M9 13.5v7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  tienda: {
    etiqueta: "Tienda",
    icono: '<path d="M6 8h12l-1.2 12H7.2L6 8zM9.2 8V6.2a2.8 2.8 0 0 1 5.6 0V8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  },
  taller: {
    etiqueta: "Taller",
    icono: '<path d="M14.8 4.6a4.5 4.5 0 0 0-5.6 5.8l-5 5a1.8 1.8 0 0 0 2.5 2.5l5-5a4.5 4.5 0 0 0 5.8-5.6l-2.6 2.6-2.2-2.2 2.1-3.1z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  },
  mirador: {
    etiqueta: "Mirador",
    icono: '<path d="M3 18.5l5.5-8.5 3.5 5.5 2.8-4 6.2 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="17" cy="6.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/>',
  },
  peligro: {
    etiqueta: "Precaución",
    aviso: true,
    icono: '<path d="M12 4l9 15.5H3L12 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v3.6M12 16.6h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  },
  cruce: {
    etiqueta: "Cruce",
    icono: '<path d="M12 21V3M3.5 12h17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  },
  foto: {
    etiqueta: "Foto",
    icono: '<path d="M3 7.5h3.5l2-2h7l2 2H21v12H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/>',
  },
  otro: {
    etiqueta: "Punto de interés",
    icono: '<circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.4"/>',
  },
};

/** Nombres alternativos que se aceptan al escribir la ficha. */
const ALIAS = {
  agua: "fuente",
  fuentes: "fuente",
  bar: "desayuno",
  cafe: "desayuno",
  cafeteria: "desayuno",
  avituallamiento: "desayuno",
  restaurante: "comida",
  almuerzo: "comida",
  cena: "comida",
  comer: "comida",
  supermercado: "tienda",
  super: "tienda",
  panaderia: "tienda",
  bici: "taller",
  mecanico: "taller",
  vistas: "mirador",
  cima: "mirador",
  cuidado: "peligro",
  ojo: "peligro",
  aparcamiento: "parking",
  salida: "parking",
  desvio: "cruce",
};

export function normalizarTipo(bruto) {
  const t = String(bruto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (TIPOS_PUNTO[t]) return t;
  if (ALIAS[t]) return ALIAS[t];
  return null;
}

/**
 * Convierte las lineas de la ficha en puntos con coordenadas y kilometro.
 * localizador viene de crearLocalizador(). avisar recibe los problemas.
 */
export function resolverPuntos(lineas, localizador, avisar = () => {}) {
  if (!Array.isArray(lineas) || lineas.length === 0) return [];
  const puntos = [];

  for (const linea of lineas) {
    const trozos = String(linea)
      .split("|")
      .map((x) => x.trim());
    if (trozos.length < 2) {
      avisar(`punto mal escrito, faltan campos: "${linea}"`);
      continue;
    }
    const [donde, tipoBruto, ...resto] = trozos;
    const texto = resto.join(" | ").trim();

    const tipo = normalizarTipo(tipoBruto);
    if (!tipo) {
      avisar(
        `tipo de punto desconocido "${tipoBruto}" en "${linea}" ` +
          `(válidos: ${Object.keys(TIPOS_PUNTO).join(", ")})`
      );
      continue;
    }

    let sitio = null;
    // Coordenadas: exigimos punto decimal en las dos. Asi "14,2" se lee como
    // el kilometro 14,2 y no como latitud 14, longitud 2.
    const coords = donde.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (coords) {
      const lat = parseFloat(coords[1]);
      const lon = parseFloat(coords[2]);
      sitio = localizador.porCoordenadas(lat, lon);
      if (sitio.separacion > 500) {
        avisar(
          `el punto "${texto || tipo}" está a ${Math.round(sitio.separacion)} m de la ruta; ` +
            `se coloca igualmente en el punto más cercano del trazado`
        );
      }
    } else {
      const km = parseFloat(donde.replace(",", "."));
      if (!Number.isFinite(km) || (donde.match(/,/g) || []).length > 1) {
        avisar(
          `no entiendo dónde está el punto "${donde}" en "${linea}". ` +
            `Escribe el kilómetro (14,2) o las coordenadas con punto decimal (38.0258,-6.2197)`
        );
        continue;
      }
      const metros = km * 1000;
      if (metros > localizador.total + 50) {
        avisar(
          `el punto del km ${km} queda fuera de la ruta, que mide ` +
            `${(localizador.total / 1000).toFixed(1)} km`
        );
        continue;
      }
      sitio = localizador.porDistancia(metros);
    }

    puntos.push({
      tipo,
      etiqueta: TIPOS_PUNTO[tipo].etiqueta,
      aviso: !!TIPOS_PUNTO[tipo].aviso,
      texto,
      km: Math.round((sitio.distancia / 1000) * 10) / 10,
      metros: Math.round(sitio.distancia),
      lat: Math.round(sitio.lat * 1e5) / 1e5,
      lon: Math.round(sitio.lon * 1e5) / 1e5,
      ele: sitio.ele === null || sitio.ele === undefined ? null : Math.round(sitio.ele),
    });
  }

  puntos.sort((a, b) => a.metros - b.metros);
  return puntos;
}

/** Puntos que ya venian como waypoints dentro del propio GPX. */
export function puntosDelGpx(waypoints, localizador) {
  if (!waypoints || waypoints.length === 0) return [];
  return waypoints.map((w) => {
    const sitio = localizador.porCoordenadas(w.lat, w.lon);
    const tipo = normalizarTipo(w.tipo) || "otro";
    return {
      tipo,
      etiqueta: TIPOS_PUNTO[tipo].etiqueta,
      aviso: !!TIPOS_PUNTO[tipo].aviso,
      texto: w.nombre || w.descripcion || "",
      km: Math.round((sitio.distancia / 1000) * 10) / 10,
      metros: Math.round(sitio.distancia),
      lat: Math.round(w.lat * 1e5) / 1e5,
      lon: Math.round(w.lon * 1e5) / 1e5,
      ele: w.ele === null ? null : Math.round(w.ele),
    };
  });
}
