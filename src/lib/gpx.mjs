// Rutometro - lectura de GPX y calculo de metricas.
// Sin dependencias externas: solo Node.

const R = 6371008.8; // radio medio de la Tierra en metros (IUGG)

// ---------------------------------------------------------------- utilidades

const rad = (d) => (d * Math.PI) / 180;

/** Distancia en metros entre dos puntos (formula del haversine). */
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function child(body, name) {
  if (!body) return null;
  const m = body.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? m[1].trim() : null;
}

function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// ------------------------------------------------------------------- parseo

/**
 * Extrae los puntos del track y los waypoints de un GPX.
 * Tolera: varios <trkseg>, varios <trk>, atributos en cualquier orden,
 * <trkpt> auto-cerrados y puntos sin <ele>.
 */
export function parseGpx(xml) {
  const points = [];
  const re = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const lat = parseFloat(attr(m[1], "lat"));
    const lon = parseFloat(attr(m[1], "lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const body = m[2] || "";
    const eleRaw = child(body, "ele");
    const timeRaw = child(body, "time");
    const ele = eleRaw === null ? null : parseFloat(eleRaw);
    points.push({
      lat,
      lon,
      ele: Number.isFinite(ele) ? ele : null,
      time: timeRaw ? Date.parse(timeRaw) : null,
    });
  }

  const waypoints = [];
  const reW = /<wpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/wpt>)/gi;
  while ((m = reW.exec(xml)) !== null) {
    const lat = parseFloat(attr(m[1], "lat"));
    const lon = parseFloat(attr(m[1], "lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const body = m[2] || "";
    const ele = parseFloat(child(body, "ele"));
    waypoints.push({
      lat,
      lon,
      ele: Number.isFinite(ele) ? ele : null,
      nombre: unescapeXml(child(body, "name") || ""),
      tipo: unescapeXml(child(body, "type") || child(body, "sym") || ""),
      descripcion: unescapeXml(child(body, "desc") || ""),
    });
  }

  const trkName = (xml.match(/<trk[^>]*>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>/i) || [])[1];
  const metaName = (xml.match(/<metadata[^>]*>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>/i) || [])[1];

  return {
    nombreGpx: unescapeXml((trkName || metaName || "").trim()),
    points,
    waypoints,
  };
}

// --------------------------------------------------------- elevacion y perfil

/** Rellena huecos de altitud por interpolacion lineal. Devuelve true si habia datos. */
function fillElevation(points) {
  const idx = points.map((p, i) => (p.ele === null ? -1 : i)).filter((i) => i >= 0);
  if (idx.length === 0) return false;
  // extremos
  for (let i = 0; i < idx[0]; i++) points[i].ele = points[idx[0]].ele;
  for (let i = idx[idx.length - 1] + 1; i < points.length; i++) {
    points[i].ele = points[idx[idx.length - 1]].ele;
  }
  // huecos interiores
  for (let k = 0; k < idx.length - 1; k++) {
    const a = idx[k];
    const b = idx[k + 1];
    if (b === a + 1) continue;
    const ea = points[a].ele;
    const eb = points[b].ele;
    for (let i = a + 1; i < b; i++) {
      points[i].ele = ea + ((eb - ea) * (i - a)) / (b - a);
    }
  }
  return true;
}

/** Media movil sobre un array numerico, ventana de +-w muestras. */
function movingAverage(values, w) {
  const out = new Array(values.length);
  let sum = 0;
  const n = values.length;
  // prefix sums para que sea O(n)
  const pre = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + values[i];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - w);
    const b = Math.min(n - 1, i + w);
    sum = pre[b + 1] - pre[a];
    out[i] = sum / (b - a + 1);
  }
  return out;
}

/**
 * Remuestrea el track a un paso constante en metros, interpolando posicion
 * y altitud. Es la base de todos los calculos: sin esto, el desnivel
 * depende de la frecuencia de grabacion del GPS.
 */
function resample(points, cum, step) {
  const total = cum[cum.length - 1];
  const out = [];
  let j = 0;
  for (let d = 0; d <= total; d += step) {
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const d0 = cum[j];
    const d1 = cum[j + 1];
    const t = d1 - d0 > 0 ? (d - d0) / (d1 - d0) : 0;
    const p0 = points[j];
    const p1 = points[j + 1] || p0;
    out.push({
      d,
      lat: p0.lat + (p1.lat - p0.lat) * t,
      lon: p0.lon + (p1.lon - p0.lon) * t,
      ele: p0.ele + (p1.ele - p0.ele) * t,
    });
  }
  const last = points[points.length - 1];
  if (out.length === 0 || out[out.length - 1].d < total - 1) {
    out.push({ d: total, lat: last.lat, lon: last.lon, ele: last.ele });
  }
  return out;
}

// ---------------------------------------------------- simplificado del trazado

function perpDist(p, a, b) {
  // distancia punto-segmento en grados proyectados (suficiente para simplificar)
  const k = Math.cos(rad(a.lat));
  const x = p.lon * k;
  const y = p.lat;
  const x1 = a.lon * k;
  const y1 = a.lat;
  const x2 = b.lon * k;
  const y2 = b.lat;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Ramer-Douglas-Peucker iterativo (sin recursion para no desbordar la pila). */
export function simplify(points, tolDeg) {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = -1;
    let maxI = -1;
    for (let i = a + 1; i < b; i++) {
      const d = perpDist(points[i], points[a], points[b]);
      if (d > maxD) {
        maxD = d;
        maxI = i;
      }
    }
    if (maxD > tolDeg && maxI > 0) {
      keep[maxI] = 1;
      stack.push([a, maxI], [maxI, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Simplifica hasta no pasar de maxPoints, subiendo la tolerancia si hace falta. */
function simplifyToBudget(points, maxPoints) {
  let tol = 0.00002; // ~2 m
  let out = simplify(points, tol);
  let guard = 0;
  while (out.length > maxPoints && guard++ < 24) {
    tol *= 1.7;
    out = simplify(points, tol);
  }
  return out;
}

// -------------------------------------------------------------------- tiempos

/** Tiempo en movimiento: descarta paradas y saltos de grabacion. */
function movingTime(points, cum) {
  let ms = 0;
  for (let i = 1; i < points.length; i++) {
    const t0 = points[i - 1].time;
    const t1 = points[i].time;
    if (!t0 || !t1) continue;
    const dt = t1 - t0;
    if (dt <= 0 || dt > 120000) continue; // salto de grabacion
    const dist = cum[i] - cum[i - 1];
    const kmh = (dist / 1000) / (dt / 3600000);
    if (kmh < 1.5) continue; // parado
    ms += dt;
  }
  return ms > 0 ? Math.round(ms / 1000) : null;
}

/**
 * Tiempo estimado en segundos. Modelo simple y declarado:
 * velocidad en llano segun tipo de bici, penalizada por la pendiente de
 * cada tramo de 10 m. No pretende ser preciso, solo orientativo.
 */
function estimateTime(samples, grades, bici) {
  const flat = { carretera: 26, gravel: 22, btt: 16, cicloturismo: 17 }[bici] || 20;
  let seconds = 0;
  for (let i = 1; i < samples.length; i++) {
    const dist = samples[i].d - samples[i - 1].d;
    const g = grades[i] || 0;
    let kmh;
    if (g > 0) kmh = flat / (1 + g * 0.17);
    else kmh = Math.min(flat * 1.65, flat * (1 + -g * 0.085));
    kmh = Math.max(4, kmh);
    seconds += (dist / 1000 / kmh) * 3600;
  }
  return Math.round(seconds);
}

// ------------------------------------------- localizar puntos en la ruta

/**
 * Devuelve un localizador que traduce entre kilometro de la ruta y
 * coordenadas, en los dos sentidos. Calcula las distancias una sola vez.
 */
export function crearLocalizador(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversine(points[i - 1], points[i]));
  }
  const total = cum[cum.length - 1];

  return {
    total,
    /** Punto de la ruta a X metros de la salida, interpolado. */
    porDistancia(metros) {
      const d = Math.max(0, Math.min(total, metros));
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < d) lo = mid + 1;
        else hi = mid;
      }
      const j = Math.max(1, lo);
      const d0 = cum[j - 1];
      const d1 = cum[j];
      const t = d1 - d0 > 0 ? (d - d0) / (d1 - d0) : 0;
      const a = points[j - 1];
      const b = points[j];
      return {
        distancia: d,
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
        ele: a.ele === null || b.ele === null ? null : a.ele + (b.ele - a.ele) * t,
      };
    },
    /** Punto de la ruta mas cercano a unas coordenadas. */
    porCoordenadas(lat, lon) {
      let mejor = 0;
      let mejorD = Infinity;
      for (let i = 0; i < points.length; i++) {
        const d = haversine({ lat, lon }, points[i]);
        if (d < mejorD) {
          mejorD = d;
          mejor = i;
        }
      }
      return {
        distancia: cum[mejor],
        lat: points[mejor].lat,
        lon: points[mejor].lon,
        ele: points[mejor].ele,
        separacion: mejorD,
      };
    },
  };
}

// ------------------------------------------------- GPX ligero de descarga

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Construye un GPX de descarga a partir del track original:
 * solo coordenadas y altitud, sin marcas de tiempo ni datos de pulso,
 * cadencia o temperatura, y con los puntos reducidos.
 *
 * Un GPX de Strava a 1 Hz puede pesar varios megas; esto lo deja en
 * unos cientos de kilobytes sin que el trazado cambie a la vista, y
 * dentro del limite de puntos que aceptan los GPS de bici.
 */
export function gpxLigero(points, nombre, maxPuntos = 3000) {
  const reducidos = simplifyToBudget(points, maxPuntos);
  const trkpts = reducidos
    .map((p) => {
      const ele = p.ele === null || p.ele === undefined ? "" : `<ele>${p.ele.toFixed(1)}</ele>`;
      return `   <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">${ele}</trkpt>`;
    })
    .join("\n");
  const n = escXml(nombre);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rutometro" xmlns="http://www.topografix.com/GPX/1/1">
 <metadata>
  <name>${n}</name>
 </metadata>
 <trk>
  <name>${n}</name>
  <trkseg>
${trkpts}
  </trkseg>
 </trk>
</gpx>
`;
  return { xml, puntos: reducidos.length };
}

// ---------------------------------------------------------------- metricas

/**
 * Calcula todas las metricas de una ruta a partir de los puntos del GPX.
 * opciones: { bici } para el tiempo estimado.
 */
export function analizar(points, opciones = {}) {
  if (points.length < 2) {
    throw new Error("el GPX tiene menos de 2 puntos de track");
  }

  // 1. distancias acumuladas sobre los puntos originales
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversine(points[i - 1], points[i]));
  }
  const distancia = cum[cum.length - 1];
  if (distancia < 10) throw new Error("el track mide menos de 10 metros");

  const conAltitud = fillElevation(points);
  const conTiempos = points.some((p) => p.time);

  // 2. remuestreo a paso fijo de 10 m
  const PASO = 10;
  const samples = resample(points, cum, PASO);

  // 3. suavizado de la altitud: 15 muestras a cada lado = ventana de 300 m.
  //    Sin esto el ruido del GPS infla el desnivel positivo hasta un 40%.
  let smooth;
  if (conAltitud) {
    smooth = movingAverage(samples.map((s) => s.ele), 15);
  } else {
    smooth = samples.map(() => 0);
  }

  let subida = 0;
  let bajada = 0;
  for (let i = 1; i < smooth.length; i++) {
    const d = smooth[i] - smooth[i - 1];
    if (d > 0) subida += d;
    else bajada -= d;
  }

  // 4. pendiente en ventana de +-50 m (10 muestras)
  const W = 5;
  const grades = new Array(samples.length).fill(0);
  for (let i = 0; i < samples.length; i++) {
    const a = Math.max(0, i - W);
    const b = Math.min(samples.length - 1, i + W);
    const dd = samples[b].d - samples[a].d;
    grades[i] = dd > 0 ? ((smooth[b] - smooth[a]) / dd) * 100 : 0;
  }

  const altitudes = conAltitud ? smooth : [];
  const altMax = conAltitud ? Math.max(...altitudes) : null;
  const altMin = conAltitud ? Math.min(...altitudes) : null;

  // pendiente maxima sostenida: ventana de 100 m, evita picos de ruido
  let pendMax = 0;
  for (const g of grades) if (g > pendMax) pendMax = g;
  let pendMin = 0;
  for (const g of grades) if (g < pendMin) pendMin = g;

  // 5. tipo de recorrido
  const cierre = haversine(points[0], points[points.length - 1]);
  let tipoRecorrido = "lineal";
  if (cierre < Math.max(400, distancia * 0.02)) {
    tipoRecorrido = "circular";
    // ida y vuelta: el regreso pisa la ida
    const mitad = Math.floor(samples.length / 2);
    if (mitad > 10) {
      let cerca = 0;
      const paso = Math.max(1, Math.floor(mitad / 60));
      let n = 0;
      for (let i = 0; i < mitad; i += paso) {
        const esp = samples[samples.length - 1 - i];
        if (haversine(samples[i], esp) < 60) cerca++;
        n++;
      }
      if (n > 0 && cerca / n > 0.7) tipoRecorrido = "ida-vuelta";
    }
  }

  // 6. perfil para el grafico: ~600 puntos
  const objetivo = 600;
  const stride = Math.max(1, Math.ceil(samples.length / objetivo));
  const perfil = [];
  for (let i = 0; i < samples.length; i += stride) {
    perfil.push([
      Math.round(samples[i].d), // metros
      conAltitud ? Math.round(smooth[i] * 10) / 10 : null,
      Math.round(grades[i] * 10) / 10,
      Math.round(samples[i].lat * 1e5) / 1e5,
      Math.round(samples[i].lon * 1e5) / 1e5,
    ]);
  }
  const ultimo = samples.length - 1;
  if ((ultimo % stride) !== 0) {
    perfil.push([
      Math.round(samples[ultimo].d),
      conAltitud ? Math.round(smooth[ultimo] * 10) / 10 : null,
      Math.round(grades[ultimo] * 10) / 10,
      Math.round(samples[ultimo].lat * 1e5) / 1e5,
      Math.round(samples[ultimo].lon * 1e5) / 1e5,
    ]);
  }

  // 7. trazado para el mapa
  const trazado = simplifyToBudget(points, 2500).map((p) => [
    Math.round(p.lat * 1e5) / 1e5,
    Math.round(p.lon * 1e5) / 1e5,
  ]);

  // 8. recuadro geografico
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (const p of points) {
    if (p.lat < latMin) latMin = p.lat;
    if (p.lat > latMax) latMax = p.lat;
    if (p.lon < lonMin) lonMin = p.lon;
    if (p.lon > lonMax) lonMax = p.lon;
  }

  const tMov = conTiempos ? movingTime(points, cum) : null;
  let tTotal = null;
  if (conTiempos) {
    const conHora = points.filter((p) => p.time);
    if (conHora.length > 1) {
      const d = (conHora[conHora.length - 1].time - conHora[0].time) / 1000;
      if (d > 0) tTotal = Math.round(d);
    }
  }
  const tEst = estimateTime(samples, grades, opciones.bici);

  return {
    distancia: Math.round(distancia), // m
    desnivelPositivo: Math.round(subida),
    desnivelNegativo: Math.round(bajada),
    altitudMaxima: altMax === null ? null : Math.round(altMax),
    altitudMinima: altMin === null ? null : Math.round(altMin),
    pendienteMaxima: Math.round(pendMax * 10) / 10,
    pendienteMinima: Math.round(pendMin * 10) / 10,
    pendienteMedia: distancia > 0 ? Math.round((subida / distancia) * 1000) / 10 : 0,
    desnivelPorKm: Math.round(subida / (distancia / 1000)),
    tipoRecorrido,
    conAltitud,
    tiempoMovimiento: tMov,
    tiempoTotal: tTotal,
    tiempoEstimado: tEst,
    inicio: { lat: points[0].lat, lon: points[0].lon },
    fin: { lat: points[points.length - 1].lat, lon: points[points.length - 1].lon },
    bbox: [latMin, lonMin, latMax, lonMax],
    perfil,
    trazado,
    numPuntos: points.length,
  };
}
