// Rutometro - plantillas HTML.
//
// Estructura inspirada en las paginas de actividad de Strava: las cifras
// primero, el mapa grande como protagonista, el perfil pegado debajo y el
// resto del contenido en bloques apilados.

import { esc, markdown } from "./content.mjs";
import { miniatura } from "./thumb.mjs";
import { TIPOS_PUNTO } from "./puntos.mjs";
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
const LEMA = "Mis rutas favoritas en bici, listas para descargar";
const HOST = "https://parra28.github.io";

const LEAFLET = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>`;

// Tramos de pendiente: escala divergente (bajada azul / llano gris / subida
// roja). La luminosidad acompana a la magnitud, asi que tambien se lee sin
// distinguir los colores.
export const TRAMOS_PENDIENTE = [
  { clase: "d4", hasta: -8, etiqueta: "≤ -8%" },
  { clase: "d3", hasta: -4, etiqueta: "-8 a -4%" },
  { clase: "d2", hasta: -1.5, etiqueta: "-4 a -1,5%" },
  { clase: "f0", hasta: 1.5, etiqueta: "llano" },
  { clase: "u1", hasta: 4, etiqueta: "1,5 a 4%" },
  { clase: "u2", hasta: 7, etiqueta: "4 a 7%" },
  { clase: "u3", hasta: 10, etiqueta: "7 a 10%" },
  { clase: "u4", hasta: Infinity, etiqueta: "> 10%" },
];

export function tramoDe(g) {
  for (const t of TRAMOS_PENDIENTE) if (g < t.hasta) return t.clase;
  return "u4";
}

/** Trazado muy reducido para las miniaturas: no necesitan mas de ~150 puntos. */
function trazadoMini(trazado, maximo = 150) {
  if (!trazado || trazado.length === 0) return [];
  const paso = Math.max(1, Math.ceil(trazado.length / maximo));
  const out = [];
  for (let i = 0; i < trazado.length; i += paso) {
    out.push([Math.round(trazado[i][0] * 1e4) / 1e4, Math.round(trazado[i][1] * 1e4) / 1e4]);
  }
  const ult = trazado[trazado.length - 1];
  out.push([Math.round(ult[0] * 1e4) / 1e4, Math.round(ult[1] * 1e4) / 1e4]);
  return out;
}

function datosMapas(rutas) {
  const datos = {};
  for (const r of rutas) datos[r.slug] = trazadoMini(r.trazado);
  return `<script type="application/json" id="datos-mapas">${JSON.stringify(datos).replace(
    /</g,
    "\\u003c"
  )}</script>`;
}

// ------------------------------------------------------------------- esqueleto

function layout({ base, titulo, descripcion, ruta, contenido, scripts = "", imagen = "" }) {
  const tituloCompleto = titulo === SITIO ? `${SITIO} · ${LEMA}` : `${titulo} · ${SITIO}`;
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
<meta name="theme-color" content="#f4f4f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)">
<link rel="stylesheet" href="${base}assets/styles.css">
<link rel="icon" href="${base}assets/icono.svg" type="image/svg+xml">
<script>
try {
  var t = localStorage.getItem("rutometro-tema");
  if (t) document.documentElement.dataset.tema = t;
} catch (e) {}
</script>
</head>
<body>
<a class="salto" href="#principal">Ir al contenido</a>
<header class="cabecera">
  <div class="contenedor cabecera-fila">
    <a class="marca" href="${base}">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M2 18h3l4-9 3 6 2-4 3 7h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>${SITIO}</span>
    </a>
    <nav class="cabecera-acciones">
      ${ruta ? `<a class="enlace-vuelta" href="${base}">Todas las rutas</a>` : ""}
      <button type="button" class="boton-tema" id="boton-tema" aria-label="Cambiar entre tema claro y oscuro" title="Cambiar tema">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M12 3v2m0 14v2m-7-9H3m18 0h-2M6.3 6.3 4.9 4.9m14.2 14.2-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
    </nav>
  </div>
</header>
<main id="principal">
${contenido}
</main>
<footer class="pie">
  <div class="contenedor">
    <p>${SITIO} — rutas propias, trazadas y verificadas sobre el terreno. Los archivos GPX se ofrecen tal cual: comprueba siempre el estado de los caminos y la normativa de la zona antes de salir.</p>
  </div>
</footer>
<script src="${base}assets/tema.js"></script>
${scripts}
</body>
</html>
`;
}

// ------------------------------------------------------------------ piezas

function insignias(r) {
  const b = TIPOS_BICI[r.bici];
  const partes = [];
  if (b) partes.push(`<span class="insignia bici-${r.bici}">${b.etiqueta}</span>`);
  if (r.tipoRecorrido) {
    partes.push(
      `<span class="insignia neutra">${esc(TIPOS_RECORRIDO[r.tipoRecorrido] || r.tipoRecorrido)}</span>`
    );
  }
  return partes.join("");
}

function puntosDificultad(n) {
  if (!n) return "";
  const puntos = [1, 2, 3, 4, 5]
    .map((i) => `<span class="punto${i <= n ? " on" : ""}"></span>`)
    .join("");
  return `<span class="dificultad" title="Dificultad: ${esc(DIFICULTADES[n] || n)}"><span class="visual" aria-hidden="true">${puntos}</span><span class="texto">${esc(DIFICULTADES[n] || n)}</span></span>`;
}

/** Tiempo que se muestra: el real si el GPX lo trae, si no el estimado. */
function tiempos(r) {
  if (r.tiempoMovimiento) {
    return [
      { etiqueta: "En movimiento", valor: duracion(r.tiempoMovimiento) },
      { etiqueta: "Tiempo total", valor: duracion(r.tiempoTotal) || "—" },
    ];
  }
  return [{ etiqueta: "Tiempo estimado", valor: duracion(r.tiempoEstimado), nota: "estimado" }];
}

function cifra(etiqueta, valor, unidad, nota) {
  if (valor === null || valor === undefined || valor === "") return "";
  return `<div class="cifra">
  <span class="cifra-valor">${valor}${unidad ? `<small>${unidad}</small>` : ""}</span>
  <span class="cifra-etiqueta">${esc(etiqueta)}</span>
  ${nota ? `<span class="cifra-nota">${esc(nota)}</span>` : ""}
</div>`;
}

/** Las cinco cifras de la ficha. */
function franjaCifras(r) {
  const t = tiempos(r);
  return `<dl class="cifras">
  ${cifra("Distancia", km(r.distancia), "km")}
  ${cifra("Desnivel +", entero(r.desnivelPositivo), "m")}
  ${t.map((x) => cifra(x.etiqueta, x.valor, "", x.nota)).join("")}
  ${cifra("Recorrido", esc(TIPOS_RECORRIDO[r.tipoRecorrido] || r.tipoRecorrido))}
</dl>`;
}

// --------------------------------------------------------------- tarjetas

function tarjeta(r, base, { compacta = false } = {}) {
  const t = tiempos(r);
  return `<article class="tarjeta${compacta ? " compacta" : ""}"
  data-nombre="${esc(r.nombre.toLowerCase())}"
  data-zona="${esc(r.zona || "")}"
  data-busqueda="${esc([r.nombre, r.zona, r.provincia, (r.tags || []).join(" ")].filter(Boolean).join(" ").toLowerCase())}"
  data-bici="${esc(r.bici || "")}"
  data-dist="${r.distancia}"
  data-dplus="${r.desnivelPositivo}"
  data-dif="${r.dificultad || 0}"
  data-orden="${r.orden}">
  <a class="tarjeta-enlace" href="${base}ruta/${r.slug}/">
    <div class="tarjeta-trazo" data-slug="${r.slug}">
      ${r.miniatura}
      ${
        r.fotos && r.fotos.length
          ? `<span class="distintivo-fotos"><svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13"><path d="M3 7h3l2-2h8l2 2h3v12H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>${r.fotos.length}</span>`
          : ""
      }
    </div>
    <div class="tarjeta-cuerpo">
      <div class="tarjeta-cabeza">
        <h2 class="tarjeta-titulo">${esc(r.nombre)}</h2>
        ${r.zona ? `<p class="tarjeta-zona">${esc(r.zona)}</p>` : ""}
      </div>
      <div class="tarjeta-insignias">${insignias(r)} ${puntosDificultad(r.dificultad)}</div>
      <dl class="cifras compactas">
        ${cifra("Distancia", km(r.distancia), "km")}
        ${cifra("Desnivel +", entero(r.desnivelPositivo), "m")}
        ${cifra(t[0].etiqueta, t[0].valor)}
      </dl>
    </div>
  </a>
</article>`;
}

// --------------------------------------------------------------------- indice

export function paginaIndice({ base, rutas, zonas }) {
  const totalKm = rutas.reduce((a, r) => a + r.distancia, 0);
  const totalD = rutas.reduce((a, r) => a + r.desnivelPositivo, 0);
  const bicis = [...new Set(rutas.map((r) => r.bici).filter(Boolean))];

  const contenido = `
<section class="portada">
  <div class="contenedor">
    <h1>${SITIO}</h1>
    <p class="lema">${LEMA}</p>
    <dl class="cifras portada-cifras">
      ${cifra("Rutas", entero(rutas.length))}
      ${cifra("Kilómetros", entero(totalKm / 1000))}
      ${cifra("Desnivel acumulado", entero(totalD), "m")}
    </dl>
  </div>
</section>

<section class="filtros" aria-label="Filtros de búsqueda">
  <div class="contenedor">
    <div class="filtros-fila">
      <div class="campo campo-buscar">
        <label for="f-buscar">Buscar</label>
        <input type="search" id="f-buscar" placeholder="Nombre, zona, puerto…" autocomplete="off">
      </div>
      <div class="campo">
        <label for="f-zona">Zona</label>
        <select id="f-zona">
          <option value="">Todas</option>
          ${zonas.map((z) => `<option value="${esc(z)}">${esc(z)}</option>`).join("")}
        </select>
      </div>
      <div class="campo">
        <label for="f-dist">Distancia máxima</label>
        <select id="f-dist">
          <option value="">Sin límite</option>
          <option value="30">Hasta 30 km</option>
          <option value="60">Hasta 60 km</option>
          <option value="100">Hasta 100 km</option>
          <option value="150">Hasta 150 km</option>
        </select>
      </div>
      <div class="campo">
        <label for="f-dplus">Desnivel máximo</label>
        <select id="f-dplus">
          <option value="">Sin límite</option>
          <option value="500">Hasta 500 m</option>
          <option value="1000">Hasta 1.000 m</option>
          <option value="2000">Hasta 2.000 m</option>
          <option value="3000">Hasta 3.000 m</option>
        </select>
      </div>
      <div class="campo">
        <label for="f-dif">Dificultad máxima</label>
        <select id="f-dif">
          <option value="">Cualquiera</option>
          <option value="1">Muy fácil</option>
          <option value="2">Fácil</option>
          <option value="3">Moderada</option>
          <option value="4">Difícil</option>
          <option value="5">Muy difícil</option>
        </select>
      </div>
      <div class="campo">
        <label for="f-orden">Ordenar por</label>
        <select id="f-orden">
          <option value="reciente">Más recientes</option>
          <option value="dist-desc">Más distancia</option>
          <option value="dist-asc">Menos distancia</option>
          <option value="dplus-desc">Más desnivel</option>
          <option value="dureza-desc">Más dureza</option>
          <option value="nombre">Nombre</option>
        </select>
      </div>
    </div>
    <div class="chips" role="group" aria-label="Tipo de bici">
      <button type="button" class="chip activo" data-bici="">Todas</button>
      ${bicis
        .map(
          (b) =>
            `<button type="button" class="chip bici-${b}" data-bici="${esc(b)}">${esc(
              TIPOS_BICI[b] ? TIPOS_BICI[b].etiqueta : b
            )}</button>`
        )
        .join("")}
    </div>
    <p class="contador" id="contador" aria-live="polite"></p>
  </div>
</section>

<section class="contenedor">
  <div class="feed" id="rejilla">
    ${rutas.map((r) => tarjeta(r, base)).join("\n")}
  </div>
  <p class="vacio" id="vacio" hidden>Ninguna ruta coincide con los filtros. <button type="button" id="limpiar">Quitar filtros</button></p>
  <p class="credito-mapas">Mapas de las miniaturas: &copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></p>
</section>
`;

  return layout({
    base,
    titulo: SITIO,
    descripcion: `${rutas.length} rutas en bici de carretera, gravel y BTT con mapa, perfil de altimetría y descarga del archivo GPX.`,
    contenido,
    scripts: `${LEAFLET}
${datosMapas(rutas)}
<script src="${base}assets/indice.js"></script>
<script src="${base}assets/minimapas.js"></script>`,
  });
}

// ------------------------------------------------------------- perfil (SVG)

function perfilSvg(perfil, puntos = [], { ancho = 1000, alto = 230 } = {}) {
  const padIzq = 46;
  const padDer = 12;
  const padArr = 14;
  const padAba = 26;
  const w = ancho - padIzq - padDer;
  const h = alto - padArr - padAba;

  const dTotal = perfil[perfil.length - 1][0];
  const eles = perfil.map((p) => p[1]).filter((e) => e !== null);
  if (eles.length === 0) return "";
  let eMin = Math.min(...eles);
  let eMax = Math.max(...eles);
  const rango = Math.max(30, eMax - eMin);
  eMin = Math.floor((eMin - rango * 0.12) / 10) * 10;
  eMax = Math.ceil((eMax + rango * 0.12) / 10) * 10;

  const X = (d) => padIzq + (d / dTotal) * w;
  const Y = (e) => padArr + h - ((e - eMin) / (eMax - eMin)) * h;

  const area = [`M${X(0).toFixed(1)} ${(padArr + h).toFixed(1)}`];
  for (const p of perfil) area.push(`L${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`);
  area.push(`L${X(dTotal).toFixed(1)} ${(padArr + h).toFixed(1)}Z`);

  const lineas = [];
  let actual = null;
  for (let i = 0; i < perfil.length; i++) {
    const clase = tramoDe(perfil[i][2]);
    const punto = `${X(perfil[i][0]).toFixed(1)},${Y(perfil[i][1]).toFixed(1)}`;
    if (!actual || actual.clase !== clase) {
      if (actual) actual.puntos.push(punto);
      actual = { clase, puntos: [punto] };
      lineas.push(actual);
    } else {
      actual.puntos.push(punto);
    }
  }

  const pc = (v, total) => ((v / total) * 100).toFixed(3);

  const rejilla = [];
  const marcasY = [];
  for (let i = 0; i <= 4; i++) {
    const e = eMin + ((eMax - eMin) * i) / 4;
    const y = Y(e);
    rejilla.push(
      `<line class="rejilla-linea" x1="${padIzq}" y1="${y.toFixed(1)}" x2="${(padIzq + w).toFixed(1)}" y2="${y.toFixed(1)}"/>`
    );
    marcasY.push(
      `<span class="marca-y" style="top:${pc(y, alto)}%;right:${pc(ancho - padIzq + 8, ancho)}%">${entero(e)}</span>`
    );
  }

  const kmTotal = dTotal / 1000;
  const pasoKm = kmTotal > 120 ? 20 : kmTotal > 60 ? 10 : kmTotal > 25 ? 5 : kmTotal > 10 ? 2 : 1;
  const marcasX = [];
  for (let k = 0; k <= kmTotal; k += pasoKm) {
    marcasX.push(`<span class="marca-x" style="left:${pc(X(k * 1000), ancho)}%">${entero(k)}</span>`);
  }

  const marcasPunto = puntos
    .map((pt) => {
      const x = X(Math.min(pt.metros, dTotal));
      let cerca = perfil[0];
      for (const q of perfil) {
        if (Math.abs(q[0] - pt.metros) < Math.abs(cerca[0] - pt.metros)) cerca = q;
      }
      const y = Y(cerca[1]);
      const titulo = `km ${decimal(pt.km)} · ${pt.etiqueta}${pt.texto ? `: ${pt.texto}` : ""}`;
      return `<g class="perfil-punto-interes${pt.aviso ? " es-aviso" : ""}"><title>${esc(titulo)}</title><line x1="${x.toFixed(1)}" y1="${(padArr + h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6"/></g>`;
    })
    .join("");

  return `<div class="perfil-caja">
<svg id="perfil" class="perfil-svg" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none"
  role="img" aria-label="Perfil de altimetría: de ${entero(eMin)} a ${entero(eMax)} metros a lo largo de ${decimal(dTotal / 1000)} kilómetros"
  data-dtotal="${dTotal}" data-emin="${eMin}" data-emax="${eMax}"
  data-padizq="${padIzq}" data-padder="${padDer}" data-padarr="${padArr}" data-padaba="${padAba}">
  <g class="rejilla-perfil">${rejilla.join("")}</g>
  <path class="perfil-area" d="${area.join(" ")}"/>
  <g class="perfil-linea">${lineas
    .map((l) => `<polyline class="g g-${l.clase}" points="${l.puntos.join(" ")}"/>`)
    .join("")}</g>
  <g class="perfil-puntos">${marcasPunto}</g>
  <line id="perfil-cruz" class="perfil-cruz" x1="0" y1="${padArr}" x2="0" y2="${padArr + h}" hidden/>
  <circle id="perfil-punto" class="perfil-punto" r="5" hidden/>
</svg>
<div class="perfil-marcas" aria-hidden="true">${marcasY.join("")}${marcasX.join("")}</div>
<span class="perfil-unidad-y" aria-hidden="true">m</span>
</div>`;
}

function leyendaPendiente() {
  return `<div class="leyenda" aria-label="Escala de pendiente">
  ${TRAMOS_PENDIENTE.map(
    (t) =>
      `<span class="leyenda-item"><span class="leyenda-color g-bg-${t.clase}" aria-hidden="true"></span>${esc(t.etiqueta)}</span>`
  ).join("")}
</div>`;
}

// ------------------------------------------------------------- ficha de ruta

export function paginaRuta({ base, r, otras }) {
  const visor =
    r.fotos && r.fotos.length
      ? `<div class="visor" id="visor" hidden role="dialog" aria-modal="true" aria-label="Foto ampliada">
  <button type="button" class="visor-cerrar" id="visor-cerrar" aria-label="Cerrar">&times;</button>
  <button type="button" class="visor-nav visor-antes" id="visor-antes" aria-label="Foto anterior">&#8249;</button>
  <figure class="visor-figura">
    <img id="visor-img" src="" alt="">
    <figcaption id="visor-pie"></figcaption>
  </figure>
  <button type="button" class="visor-nav visor-despues" id="visor-despues" aria-label="Foto siguiente">&#8250;</button>
</div>`
      : "";

  const practicos = [
    r.parking ? ["Salida y aparcamiento", esc(r.parking)] : null,
    r.epoca ? ["Mejor época", esc(r.epoca)] : null,
    r.agua ? ["Agua", esc(r.agua)] : null,
    r.superficie ? ["Superficie", esc(r.superficie)] : null,
    r.fecha ? ["Ruta registrada el", esc(fechaLarga(r.fecha) || r.fecha)] : null,
  ].filter(Boolean);

  const contenido = `
<article class="ruta">
  <div class="contenedor">
    <nav class="migas"><a href="${base}">Rutas</a> <span aria-hidden="true">›</span> <span>${esc(r.nombre)}</span></nav>
    <header class="ruta-cabecera">
      <div class="ruta-titulo">
        <h1>${esc(r.nombre)}</h1>
        <p class="ruta-sub">${[r.zona, r.provincia].filter(Boolean).map(esc).join(" · ")}</p>
        <div class="tarjeta-insignias">${insignias(r)} ${puntosDificultad(r.dificultad)}</div>
      </div>
      <div class="descargas">
        <a class="boton principal" href="${base}gpx/${r.slug}.gpx" download>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Descargar GPX
        </a>
        <p class="peso">${esc(r.pesoGpx)} · ${entero(r.numPuntos)} puntos</p>
      </div>
    </header>
    ${franjaCifras(r)}
  </div>

  <div class="contenedor lienzo">
    <div class="panel">
      <div id="mapa" class="mapa" data-slug="${esc(r.slug)}"></div>
      ${
        r.conAltitud
          ? `<div class="perfil-envoltorio">
        ${perfilSvg(r.perfil, r.puntos)}
        <div id="perfil-globo" class="globo" hidden></div>
      </div>
      <div class="panel-pie">
        <span class="panel-nota">Pasa el cursor por el perfil para ver ese punto en el mapa.</span>
        ${leyendaPendiente()}
      </div>`
          : `<div class="panel-pie"><span class="panel-nota">Este GPX no incluye altitudes, así que no hay perfil.</span></div>`
      }
    </div>
  </div>

  <div class="contenedor">
    ${
      r.descripcionHtml
        ? `<section class="bloque prosa">
      <h2>La ruta</h2>
      ${r.descripcionHtml}
    </section>`
        : ""
    }

    ${
      r.puntos && r.puntos.length
        ? `<section class="bloque">
      <h2>Puntos de interés</h2>
      <ul class="puntos">
        ${r.puntos
          .map(
            (pt) => `<li class="punto-item${pt.aviso ? " es-aviso" : ""}">
          <span class="punto-icono" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17">${
            (TIPOS_PUNTO[pt.tipo] || TIPOS_PUNTO.otro).icono
          }</svg></span>
          <span class="punto-km">km ${decimal(pt.km)}</span>
          <span class="punto-texto"><b>${esc(pt.etiqueta)}</b>${pt.texto ? ` · ${esc(pt.texto)}` : ""}</span>
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
      practicos.length
        ? `<section class="bloque">
      <h2>Datos prácticos</h2>
      <dl class="practicos">
        ${practicos.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
      </dl>
    </section>`
        : ""
    }

    ${
      r.avisos
        ? `<section class="bloque">
      <h2>Avisos</h2>
      <div class="aviso importante">${markdown(r.avisos)}</div>
    </section>`
        : ""
    }

    ${
      otras.length
        ? `<section class="bloque">
      <h2>Otras rutas</h2>
      <div class="feed">${otras.map((o) => tarjeta(o, base, { compacta: true })).join("")}</div>
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
<script src="${base}assets/ruta.js"></script>
${r.fotos && r.fotos.length ? `<script src="${base}assets/galeria.js"></script>` : ""}
${otras.length ? `${datosMapas(otras)}\n<script src="${base}assets/minimapas.js"></script>` : ""}`,
  });
}

export { miniatura };
