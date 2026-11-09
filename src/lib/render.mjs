// Rutometro - plantillas HTML.
//
// Lenguaje visual: tinta sobre papel, filetes de un pixel, sin esquinas
// redondeadas, sin sombras y sin degradados. Los datos van en monoespaciada,
// como la pantalla de un ciclocomputador.
//
// Un solo elemento atrevido: el perfil de altimetria como silueta maciza en
// bermellon, a sangre. Todo lo demas se mantiene callado.

import { esc, markdown } from "./content.mjs";
import { TIPOS_PUNTO } from "./puntos.mjs";
import { analizarVideo } from "./video.mjs";
import {
  TIPOS_BICI,
  TIPOS_RECORRIDO,
  DIFICULTADES,
  km,
  entero,
  decimal,
  duracion,
  fechaLarga,
} from "./formato.mjs";

const SITIO = "Rutómetro";
const LEMA = "Rutas propias trazadas sobre el terreno. Cada una con su perfil, sus paradas y el GPX listo para descargar.";
const HOST = "https://parra28.github.io";

const FUENTES = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`;

const LEAFLET = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>`;

// ------------------------------------------------------------------ silueta

/**
 * El perfil como silueta maciza. Es la pieza grafica del sitio.
 * Con `hero` ademas lleva las paradas atravesandola y la regla de kilometros,
 * y los nodos que el JavaScript usa para seguir el cursor.
 */
function silueta(perfil, { puntos = [], hero = false } = {}) {
  const W = 1000;
  const H = 240;
  const dTotal = perfil[perfil.length - 1][0];
  const eles = perfil.map((p) => p[1]).filter((e) => e !== null);
  if (eles.length === 0) return "";
  const techo = Math.max(...eles);
  const suelo = Math.min(...eles);
  const rango = Math.max(40, techo - suelo);
  const base = suelo - rango * 0.3;
  const alto = techo + rango * 0.12;

  const X = (d) => (d / dTotal) * W;
  const Y = (e) => H - ((e - base) / (alto - base)) * H;

  const d =
    `M0,${H} ` +
    perfil.map((p) => `L${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ") +
    ` L${W},${H} Z`;

  if (!hero) {
    return `<svg class="silueta" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
  }

  const kmTotal = dTotal / 1000;
  const paso = kmTotal > 100 ? 20 : kmTotal > 40 ? 10 : kmTotal > 15 ? 5 : 2;
  const marcas = [];
  for (let k = paso; k < kmTotal; k += paso) marcas.push(k);

  const reglas = puntos
    .map((pt) => {
      const x = X(Math.min(pt.metros, dTotal));
      return `<line class="corte${pt.aviso ? " es-aviso" : ""}" x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${H}"><title>${esc(
        `${pt.etiqueta} · km ${decimal(pt.km)}`
      )}</title></line>`;
    })
    .join("");

  const etiquetas = puntos
    .map((pt) => {
      const pos = Math.min(pt.metros, dTotal) / dTotal;
      const alFinal = pos > 0.8;
      return `<span class="corte-etiqueta${alFinal ? " al-final" : ""}" style="left:${(pos * 100).toFixed(3)}%">${esc(
        pt.etiqueta
      )} · km ${decimal(pt.km)}</span>`;
    })
    .join("");

  const regla = marcas
    .map(
      (k) =>
        `<span class="marca-km" style="left:${((k * 1000) / dTotal * 100).toFixed(3)}%"><i></i><b>${entero(k)}</b></span>`
    )
    .join("");

  return `<div class="hero-perfil">
  <div class="hero-etiquetas">${etiquetas}</div>
  <svg id="perfil" class="silueta hero" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
    role="img" aria-label="Perfil de altimetría: de ${entero(suelo)} a ${entero(techo)} metros a lo largo de ${decimal(kmTotal)} kilómetros"
    data-dtotal="${dTotal}" data-base="${base.toFixed(2)}" data-alto="${alto.toFixed(2)}" data-h="${H}" data-w="${W}">
    <path d="${d}"/>
    <g class="cortes">${reglas}</g>
    <line id="perfil-cruz" class="perfil-cruz" x1="0" y1="0" x2="0" y2="${H}" hidden/>
    <circle id="perfil-punto" class="perfil-punto" r="5" hidden/>
  </svg>
  <div class="hero-regla">${regla}</div>
  <div id="perfil-globo" class="globo" hidden></div>
</div>`;
}

/** Trazado reducido para los minimapas del carrusel. */
function trazadoMini(trazado, maximo = 160) {
  if (!trazado || trazado.length === 0) return [];
  const paso = Math.max(1, Math.ceil(trazado.length / maximo));
  const out = [];
  for (let i = 0; i < trazado.length; i += paso) {
    out.push([Math.round(trazado[i][0] * 1e4) / 1e4, Math.round(trazado[i][1] * 1e4) / 1e4]);
  }
  const u = trazado[trazado.length - 1];
  out.push([Math.round(u[0] * 1e4) / 1e4, Math.round(u[1] * 1e4) / 1e4]);
  return out;
}

function datosMapas(rutas) {
  const datos = {};
  for (const r of rutas) datos[r.slug] = trazadoMini(r.trazado);
  return `<script type="application/json" id="datos-mapas">${JSON.stringify(datos).replace(/</g, "\\u003c")}</script>`;
}

// ------------------------------------------------------------------- piezas

function dato(valor, unidad, etiqueta, { grande = false } = {}) {
  if (valor === null || valor === undefined || valor === "") return "";
  return `<div class="dato${grande ? " grande" : ""}">
  <span class="dato-valor mono">${valor}${unidad ? `<small>${esc(unidad)}</small>` : ""}</span>
  <span class="dato-etiqueta">${esc(etiqueta)}</span>
</div>`;
}

function tiempos(r) {
  if (r.tiempoMovimiento) {
    return [
      { etiqueta: "En movimiento", valor: duracion(r.tiempoMovimiento) },
      { etiqueta: "Tiempo total", valor: duracion(r.tiempoTotal) || "—" },
    ];
  }
  return [{ etiqueta: "Tiempo estimado", valor: duracion(r.tiempoEstimado) }];
}

/** Distintivo del tipo de bici: lo primero que debe verse de una ruta. */
function distintivo(r) {
  const b = TIPOS_BICI[r.bici];
  if (!b) return "";
  return `<span class="tipo tipo-${esc(r.bici)}">${esc(b.etiqueta)}</span>`;
}

function meta(r) {
  const partes = [r.zona, TIPOS_RECORRIDO[r.tipoRecorrido]];
  if (r.dificultad) partes.push(DIFICULTADES[r.dificultad]);
  if (r.fotos && r.fotos.length) partes.push(`${r.fotos.length} ${r.fotos.length === 1 ? "foto" : "fotos"}`);
  if (r.video) partes.push("vídeo");
  return partes.filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('<span class="sep">/</span>');
}

// ------------------------------------------------------------------ esqueleto

function layout({ base, titulo, descripcion, ruta, contenido, scripts = "", imagen = "", ver = "" }) {
  const v = ver ? `?v=${ver}` : "";
  const tituloCompleto = titulo === SITIO ? `${SITIO} · Rutas en bici` : `${titulo} · ${SITIO}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:type" content="website">
${imagen ? `<meta property="og:image" content="${esc(imagen)}">\n<meta name="twitter:card" content="summary_large_image">` : ""}
<meta name="theme-color" content="#f4f4f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0c0c0c" media="(prefers-color-scheme: dark)">
${FUENTES}
<link rel="stylesheet" href="${base}assets/styles.css${v}">
<link rel="icon" href="${base}assets/icono.svg" type="image/svg+xml">
<script>
try { var t = localStorage.getItem("rutometro-tema"); if (t) document.documentElement.dataset.tema = t; } catch (e) {}
</script>
</head>
<body>
<a class="salto" href="#principal">Ir al contenido</a>
<header class="barra">
  <div class="caja barra-fila">
    <a class="marca" href="${base}">RUTÓMETRO</a>
    <div class="barra-der">
      ${ruta ? `<a class="volver" href="${base}">Todas las rutas</a>` : ""}
      <button type="button" id="boton-tema" class="boton-tema" aria-label="Cambiar entre tema claro y oscuro">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>
      </button>
    </div>
  </div>
</header>
<main id="principal">
${contenido}
</main>
<footer class="pie">
  <div class="caja">
    <p>Rutas propias, trazadas y verificadas sobre el terreno. Los archivos GPX se ofrecen tal cual: comprueba siempre el estado de los caminos y la normativa de la zona antes de salir.</p>
  </div>
</footer>
<script src="${base}assets/tema.js${v}"></script>
${scripts}
</body>
</html>
`;
}

// -------------------------------------------------------------------- filas

function fila(r, base, { numero = null } = {}) {
  const t = tiempos(r);
  return `<article class="ruta-fila"
  data-busqueda="${esc([r.nombre, r.zona, r.provincia, (r.tags || []).join(" ")].filter(Boolean).join(" ").toLowerCase())}"
  data-zona="${esc(r.zona || "")}"
  data-bici="${esc(r.bici || "")}"
  data-dist="${r.distancia}"
  data-dplus="${r.desnivelPositivo}"
  data-dif="${r.dificultad || 0}"
  data-orden="${r.orden}">
  <a class="ruta-enlace" href="${base}ruta/${r.slug}/">
    <div class="ruta-cabeza">
      <div class="ruta-ident">
        ${numero !== null ? `<span class="ruta-num mono">${String(numero).padStart(2, "0")}</span>` : ""}
        <div>
          <div class="ruta-titulo-fila">
            ${distintivo(r)}
            <h2 class="nombre">${esc(r.nombre)}</h2>
          </div>
          <div class="ruta-meta">${meta(r)}</div>
        </div>
      </div>
      <div class="ruta-datos">
        ${dato(km(r.distancia), "km", "Distancia")}
        ${dato(entero(r.desnivelPositivo), "m", "Desnivel +")}
        ${dato(t[0].valor, "", t[0].etiqueta)}
      </div>
    </div>
  </a>
  ${carrusel(r, base)}
</article>`;
}

/**
 * Deslizable de la fila: el perfil primero, que es lo que identifica la
 * ruta de un vistazo, luego el mapa y despues las fotos. Se mueve con el
 * dedo, con la rueda o pulsando las etiquetas.
 */
function carrusel(r, base) {
  const fotos = (r.fotos || []).slice(0, 4);
  const diapos = [
    `<div class="diapo"><div class="minimapa" data-slug="${esc(r.slug)}"></div></div>`,
    `<div class="diapo"><a class="diapo-enlace" href="${base}ruta/${r.slug}/" aria-label="Ver ${esc(
      r.nombre
    )}">${silueta(r.perfil)}</a></div>`,
    ...fotos.map(
      (f, i) =>
        `<div class="diapo"><img src="${base}fotos/${r.slug}/${encodeURIComponent(
          f.archivo
        )}" alt="${esc(f.pie)}" loading="lazy" decoding="async">${
          f.pie ? `<span class="diapo-pie">${esc(f.pie)}</span>` : ""
        }</div>`
    ),
  ];
  const nombres = ["Mapa", "Desnivel", ...fotos.map((f, i) => `Foto ${i + 1}`)];

  return `<div class="carrusel" data-slug="${esc(r.slug)}">
  <div class="carrusel-pista">${diapos.join("")}</div>
  <div class="carrusel-tabs" role="tablist" aria-label="Vistas de ${esc(r.nombre)}">
    ${nombres
      .map(
        (n, i) =>
          `<button type="button" class="carrusel-tab${i === 0 ? " activo" : ""}" data-indice="${i}" role="tab" aria-selected="${
            i === 0
          }">${esc(n)}</button>`
      )
      .join("")}
  </div>
</div>`;
}

// -------------------------------------------------------------------- indice

export function paginaIndice({ base, rutas, zonas, ver = "" }) {
  const v = ver ? `?v=${ver}` : "";
  const totalKm = rutas.reduce((a, r) => a + r.distancia, 0);
  const totalD = rutas.reduce((a, r) => a + r.desnivelPositivo, 0);
  const bicis = [...new Set(rutas.map((r) => r.bici).filter(Boolean))];

  const contenido = `
<div class="caja">
  <section class="portada">
    <div class="portada-fila">
      <h1 class="nombre titular-portada">${SITIO}</h1>
      <div class="portada-datos">
        ${dato(entero(rutas.length), "", "Rutas")}
        ${dato(entero(totalKm / 1000), "km", "Recorridos")}
        ${dato(entero(totalD), "m", "Desnivel")}
      </div>
    </div>
    <p class="lema">${LEMA}</p>
  </section>

  <section class="controles" aria-label="Buscar y filtrar">
    <div class="buscador">
      <label for="f-buscar" class="dato-etiqueta">Buscar</label>
      <input type="search" id="f-buscar" placeholder="nombre, zona, pueblo, puerto…" autocomplete="off">
    </div>
    <div class="filtros">
      <div class="grupo">
        <span class="grupo-nombre">Bici</span>
        <button type="button" class="chip activo" data-bici="">Todas</button>
        ${bicis
          .map(
            (b) =>
              `<button type="button" class="chip" data-bici="${esc(b)}">${esc(
                TIPOS_BICI[b] ? TIPOS_BICI[b].etiqueta : b
              )}</button>`
          )
          .join("")}
      </div>
      ${
        zonas.length > 1
          ? `<div class="grupo">
        <span class="grupo-nombre">Zona</span>
        <select id="f-zona" aria-label="Zona">
          <option value="">Todas</option>
          ${zonas.map((z) => `<option value="${esc(z)}">${esc(z)}</option>`).join("")}
        </select>
      </div>`
          : ""
      }
      <div class="grupo">
        <span class="grupo-nombre">Distancia</span>
        <select id="f-dist" aria-label="Distancia máxima">
          <option value="">Toda</option>
          <option value="30">Hasta 30 km</option>
          <option value="60">Hasta 60 km</option>
          <option value="100">Hasta 100 km</option>
          <option value="150">Hasta 150 km</option>
        </select>
      </div>
      <div class="grupo">
        <span class="grupo-nombre">Desnivel</span>
        <select id="f-dplus" aria-label="Desnivel máximo">
          <option value="">Todo</option>
          <option value="500">Hasta 500 m</option>
          <option value="1000">Hasta 1.000 m</option>
          <option value="2000">Hasta 2.000 m</option>
          <option value="3000">Hasta 3.000 m</option>
        </select>
      </div>
      <div class="grupo">
        <span class="grupo-nombre">Dificultad</span>
        <select id="f-dif" aria-label="Dificultad máxima">
          <option value="">Toda</option>
          <option value="1">Muy fácil</option>
          <option value="2">Fácil</option>
          <option value="3">Moderada</option>
          <option value="4">Difícil</option>
          <option value="5">Muy difícil</option>
        </select>
      </div>
      <div class="grupo derecha">
        <span class="grupo-nombre">Orden</span>
        <button type="button" class="chip activo" data-orden="reciente">Recientes</button>
        <button type="button" class="chip" data-orden="dist-desc">Distancia</button>
        <button type="button" class="chip" data-orden="dplus-desc">Desnivel</button>
      </div>
    </div>
    <p class="contador mono" id="contador" aria-live="polite"></p>
  </section>

  <section id="rejilla">
    ${rutas.map((r, i) => fila(r, base, { numero: i + 1 })).join("\n")}
  </section>
  <p class="vacio" id="vacio" hidden>Ninguna ruta coincide. <button type="button" id="limpiar">Quitar los filtros</button></p>
</div>
`;

  return layout({
    base,
    titulo: SITIO,
    descripcion: `${rutas.length} rutas en bici de carretera, gravel y BTT con mapa, perfil de altimetría y descarga del archivo GPX.`,
    contenido,
    scripts: `${LEAFLET}
${datosMapas(rutas)}
<script src="${base}assets/indice.js${v}"></script>
<script src="${base}assets/carrusel.js${v}"></script>`,
    ver,
  });
}

// --------------------------------------------------------------------- ficha

export function paginaRuta({ base, r, otras, ver = "" }) {
  const v = ver ? `?v=${ver}` : "";
  const video = analizarVideo(r.video);
  const t = tiempos(r);

  const practicos = [
    r.parking ? ["Salida y aparcamiento", esc(r.parking)] : null,
    r.epoca ? ["Mejor época", esc(r.epoca)] : null,
    r.agua ? ["Agua", esc(r.agua)] : null,
    r.superficie ? ["Superficie", esc(r.superficie)] : null,
    r.fecha ? ["Registrada el", esc(fechaLarga(r.fecha) || r.fecha)] : null,
  ].filter(Boolean);

  const visor =
    r.fotos && r.fotos.length
      ? `<div class="visor" id="visor" hidden role="dialog" aria-modal="true" aria-label="Foto ampliada">
  <button type="button" class="visor-cerrar" id="visor-cerrar" aria-label="Cerrar">×</button>
  <button type="button" class="visor-nav visor-antes" id="visor-antes" aria-label="Foto anterior">‹</button>
  <figure class="visor-figura"><img id="visor-img" src="" alt=""><figcaption id="visor-pie"></figcaption></figure>
  <button type="button" class="visor-nav visor-despues" id="visor-despues" aria-label="Foto siguiente">›</button>
</div>`
      : "";

  const contenido = `
<article class="ficha">
  <div class="caja">
    <nav class="migas"><a href="${base}">Rutas</a> <span class="sep">/</span> <span>${esc(r.nombre)}</span></nav>
    <header class="ficha-cabeza">
      <div>
        ${distintivo(r)}
        <h1 class="nombre titular">${esc(r.nombre)}</h1>
        <div class="ruta-meta grande">${meta(r)}</div>
      </div>
      <div class="descarga">
        <a class="boton principal" href="${base}gpx/${r.slug}.gpx" download>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 20h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Descargar GPX
        </a>
        <p class="peso mono">${esc(r.pesoGpx)} · ${entero(r.numPuntos)} puntos</p>
      </div>
    </header>
    <div class="cifras">
      ${dato(km(r.distancia), "km", "Distancia", { grande: true })}
      ${dato(entero(r.desnivelPositivo), "m", "Desnivel +", { grande: true })}
      ${t.map((x) => dato(x.valor, "", x.etiqueta, { grande: true })).join("")}
      ${dato(esc(TIPOS_RECORRIDO[r.tipoRecorrido] || r.tipoRecorrido), "", "Recorrido", { grande: true })}
    </div>
  </div>

  ${
    r.conAltitud
      ? `${silueta(r.perfil, { puntos: r.puntos || [], hero: true })}
  <div class="caja"><p class="pie-grafico">Pasa el cursor por el perfil para ver ese punto en el mapa. Las líneas verticales son las paradas.</p></div>`
      : ""
  }

  <div class="caja">
    <section class="bloque">
      <h2>Mapa</h2>
      <div id="mapa" class="mapa"></div>
    </section>

    ${r.descripcionHtml ? `<section class="bloque prosa"><h2>La ruta</h2>${r.descripcionHtml}</section>` : ""}

    ${
      r.puntos && r.puntos.length
        ? `<section class="bloque">
      <h2>Paradas</h2>
      <ul class="paradas">
        ${r.puntos
          .map(
            (pt) => `<li class="parada${pt.aviso ? " es-aviso" : ""}">
          <span class="parada-km mono">km ${decimal(pt.km)}</span>
          <span class="parada-icono" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16">${
            (TIPOS_PUNTO[pt.tipo] || TIPOS_PUNTO.otro).icono
          }</svg></span>
          <span class="parada-texto"><b>${esc(pt.etiqueta)}</b>${pt.texto ? ` · ${esc(pt.texto)}` : ""}</span>
        </li>`
          )
          .join("")}
      </ul>
    </section>`
        : ""
    }

    ${
      r.fotos && r.fotos.length
        ? `<section class="bloque">
      <h2>Fotos</h2>
      <div class="galeria" id="galeria">
        ${r.fotos
          .map(
            (f, i) =>
              `<button type="button" class="galeria-item" data-indice="${i}" aria-label="Ampliar foto ${i + 1}${
                f.pie ? `: ${esc(f.pie)}` : ""
              }">
          <img src="${base}fotos/${r.slug}/${encodeURIComponent(f.archivo)}" alt="${esc(f.pie)}" loading="lazy" decoding="async">
          ${f.pie ? `<span class="galeria-pie">${esc(f.pie)}</span>` : ""}
        </button>`
          )
          .join("")}
      </div>
    </section>`
        : ""
    }

    ${
      video
        ? `<section class="bloque">
      <h2>Vídeo</h2>
      <div class="video${video.vertical ? " vertical" : ""}" id="video"
           data-incrustar="${esc(video.incrustar)}" data-plataforma="${esc(video.plataforma)}">
        <div class="video-marco">
          <button type="button" class="video-boton">
            <span class="video-play" aria-hidden="true">▶</span>
            <span class="video-texto">Ver el vídeo<small>Se carga desde ${esc(video.plataforma)} al pulsar</small></span>
          </button>
        </div>
      </div>
      <p class="video-enlace"><a href="${esc(video.enlace)}" rel="noopener noreferrer" target="_blank">Abrir en ${esc(video.plataforma)}</a></p>
    </section>`
        : ""
    }

    ${
      practicos.length
        ? `<section class="bloque">
      <h2>Datos prácticos</h2>
      <dl class="practicos">${practicos.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    </section>`
        : ""
    }

    ${r.avisos ? `<section class="bloque"><h2>Avisos</h2><div class="aviso">${markdown(r.avisos)}</div></section>` : ""}

    ${
      otras.length
        ? `<section class="bloque">
      <h2>Otras rutas</h2>
      ${otras.map((o) => fila(o, base)).join("")}
    </section>`
        : ""
    }
  </div>
</article>
${visor}
`;

  const datosRuta = JSON.stringify({
    nombre: r.nombre,
    trazado: r.trazado,
    perfil: r.perfil,
    inicio: r.inicio,
    fin: r.fin,
    distancia: r.distancia,
    conAltitud: r.conAltitud,
    puntos: (r.puntos || []).map((pt) => ({
      lat: pt.lat,
      lon: pt.lon,
      km: pt.km,
      tipo: pt.tipo,
      etiqueta: pt.etiqueta,
      texto: pt.texto,
      aviso: pt.aviso,
      icono: (TIPOS_PUNTO[pt.tipo] || TIPOS_PUNTO.otro).icono,
    })),
  });

  return layout({
    base,
    titulo: r.nombre,
    descripcion: `${km(r.distancia)} km y ${entero(r.desnivelPositivo)} m de desnivel positivo${
      r.zona ? ` por ${r.zona}` : ""
    }. Mapa, perfil de altimetría y descarga del GPX.`,
    ruta: true,
    imagen:
      r.fotos && r.fotos.length
        ? `${HOST}${base}fotos/${r.slug}/${encodeURIComponent(r.fotos[0].archivo)}`
        : "",
    contenido,
    scripts: `${LEAFLET}
<script type="application/json" id="datos-ruta">${datosRuta.replace(/</g, "\\u003c")}</script>
<script src="${base}assets/ruta.js${v}"></script>
${r.fotos && r.fotos.length ? `<script src="${base}assets/galeria.js${v}"></script>` : ""}
${video ? `<script src="${base}assets/video.js${v}"></script>` : ""}
${otras.length ? `${datosMapas(otras)}\n<script src="${base}assets/carrusel.js${v}"></script>` : ""}`,
    ver,
  });
}
