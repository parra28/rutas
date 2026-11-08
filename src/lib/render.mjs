// Rutometro - plantillas HTML. Todo se genera en el build; el navegador
// solo recibe HTML plano mas un poco de JavaScript para filtrar e interactuar.

import { esc, markdown } from "./content.mjs";
import { miniatura } from "./thumb.mjs";
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

// Tramos de pendiente: escala divergente (bajada azul / llano gris / subida roja).
// La luminosidad acompana a la magnitud, asi que tambien se lee sin distinguir
// los colores.
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

/** Datos de los trazados que necesitan los minimapas de las tarjetas. */
function datosMapas(rutas) {
  const datos = {};
  for (const r of rutas) datos[r.slug] = trazadoMini(r.trazado);
  return `<script type="application/json" id="datos-mapas">${JSON.stringify(datos).replace(
    /</g,
    "\\u003c"
  )}</script>`;
}

const LEAFLET = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>`;

export function tramoDe(g) {
  for (const t of TRAMOS_PENDIENTE) if (g < t.hasta) return t.clase;
  return "u4";
}

// ------------------------------------------------------------------- esqueleto

function layout({ base, titulo, descripcion, ruta, contenido, scripts = "", clase = "", imagen = "" }) {
  const tituloCompleto = titulo === SITIO ? `${SITIO} · ${LEMA}` : `${titulo} · ${SITIO}`;
  return `<!doctype html>
<html lang="es" class="${clase}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:type" content="website">
${imagen ? `<meta property="og:image" content="${esc(imagen)}">\n<meta name="twitter:card" content="summary_large_image">` : ""}
<meta name="theme-color" content="#f9f9f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)">
<link rel="stylesheet" href="${base}assets/styles.css">
<link rel="icon" href="${base}assets/icono.svg" type="image/svg+xml">
<script>
// Tema antes de pintar, para que no parpadee.
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

// ------------------------------------------------------------------- tarjetas

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

function tarjeta(r, base) {
  return `<article class="tarjeta"
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
          ? `<span class="distintivo-fotos"><svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13"><path d="M3 7h3l2-2h8l2 2h3v12H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>${
              r.fotos.length
            }</span>`
          : ""
      }
    </div>
    <div class="tarjeta-cuerpo">
      <h2 class="tarjeta-titulo">${esc(r.nombre)}</h2>
      ${r.zona ? `<p class="tarjeta-zona">${esc(r.zona)}</p>` : ""}
      <div class="tarjeta-insignias">${insignias(r)}</div>
      <dl class="tarjeta-datos">
        <div><dt>Distancia</dt><dd>${km(r.distancia)} km</dd></div>
        <div><dt>Desnivel +</dt><dd>${entero(r.desnivelPositivo)} m</dd></div>
        <div><dt>Dureza</dt><dd>${entero(r.desnivelPorKm)} m/km</dd></div>
      </dl>
      ${puntosDificultad(r.dificultad)}
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
    <dl class="resumen">
      <div><dt>Rutas</dt><dd>${entero(rutas.length)}</dd></div>
      <div><dt>Kilómetros</dt><dd>${entero(totalKm / 1000)}</dd></div>
      <div><dt>Desnivel acumulado</dt><dd>${entero(totalD)} m</dd></div>
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
          <option value="dureza-desc">Más dureza (m/km)</option>
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
  <div class="rejilla" id="rejilla">
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

/**
 * Perfil de altimetria en SVG, generado en el build.
 * Una sola serie (la altitud), con el borde superior coloreado por pendiente.
 * El JavaScript solo le anade la cruz y el globo al pasar el raton.
 */
function perfilSvg(perfil, { ancho = 1000, alto = 260 } = {}) {
  const padIzq = 46;
  const padDer = 12;
  const padArr = 14;
  const padAba = 28;
  const w = ancho - padIzq - padDer;
  const h = alto - padArr - padAba;

  const dTotal = perfil[perfil.length - 1][0];
  const eles = perfil.map((p) => p[1]).filter((e) => e !== null);
  if (eles.length === 0) return "";
  let eMin = Math.min(...eles);
  let eMax = Math.max(...eles);
  const rango = Math.max(30, eMax - eMin);
  // margen del 12% arriba y abajo, redondeado a 10 m
  eMin = Math.floor((eMin - rango * 0.12) / 10) * 10;
  eMax = Math.ceil((eMax + rango * 0.12) / 10) * 10;

  const X = (d) => padIzq + (d / dTotal) * w;
  const Y = (e) => padArr + h - ((e - eMin) / (eMax - eMin)) * h;

  // area rellena
  const area = [`M${X(0).toFixed(1)} ${(padArr + h).toFixed(1)}`];
  for (const p of perfil) area.push(`L${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`);
  area.push(`L${X(dTotal).toFixed(1)} ${(padArr + h).toFixed(1)}Z`);

  // linea superior por tramos de pendiente
  const lineas = [];
  let actual = null;
  for (let i = 0; i < perfil.length; i++) {
    const clase = tramoDe(perfil[i][2]);
    const punto = `${X(perfil[i][0]).toFixed(1)},${Y(perfil[i][1]).toFixed(1)}`;
    if (!actual || actual.clase !== clase) {
      if (actual) actual.puntos.push(punto); // empalme sin huecos
      actual = { clase, puntos: [punto] };
      lineas.push(actual);
    } else {
      actual.puntos.push(punto);
    }
  }

  // Las marcas de los ejes van en HTML sobre el SVG: al estirarse el SVG
  // (preserveAspectRatio="none") el texto se deformaria.
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
    marcasX.push(
      `<span class="marca-x" style="left:${pc(X(k * 1000), ancho)}%">${entero(k)}</span>`
    );
  }

  return `<div class="perfil-caja">
<svg id="perfil" class="perfil-svg" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none"
  role="img" aria-label="Perfil de altimetría de la ruta: de ${entero(eMin)} a ${entero(eMax)} metros a lo largo de ${decimal(dTotal / 1000)} kilómetros"
  data-dtotal="${dTotal}" data-emin="${eMin}" data-emax="${eMax}"
  data-padizq="${padIzq}" data-padder="${padDer}" data-padarr="${padArr}" data-padaba="${padAba}">
  <g class="rejilla-perfil">${rejilla.join("")}</g>
  <path class="perfil-area" d="${area.join(" ")}"/>
  <g class="perfil-linea">${lineas
    .map((l) => `<polyline class="g g-${l.clase}" points="${l.puntos.join(" ")}"/>`)
    .join("")}</g>
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
      `<span class="leyenda-item"><span class="leyenda-color g-bg-${t.clase}" aria-hidden="true"></span>${esc(
        t.etiqueta
      )}</span>`
  ).join("")}
</div>`;
}

// ------------------------------------------------------------- ficha de ruta

function dato(etiqueta, valor, nota) {
  if (valor === null || valor === undefined || valor === "") return "";
  return `<div class="dato"><dt>${esc(etiqueta)}</dt><dd>${valor}${
    nota ? `<span class="nota">${esc(nota)}</span>` : ""
  }</dd></div>`;
}

export function paginaRuta({ base, r, otras }) {
  const tiempo = r.tiempoMovimiento
    ? { valor: duracion(r.tiempoMovimiento), nota: "real, en movimiento" }
    : { valor: duracion(r.tiempoEstimado), nota: "estimado" };

  const visor = (r.fotos && r.fotos.length)
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

  const stats = `
<dl class="datos">
  ${dato("Distancia", `${km(r.distancia)} <small>km</small>`)}
  ${dato("Desnivel +", `${entero(r.desnivelPositivo)} <small>m</small>`)}
  ${dato("Desnivel −", `${entero(r.desnivelNegativo)} <small>m</small>`)}
  ${r.conAltitud ? dato("Altitud máxima", `${entero(r.altitudMaxima)} <small>m</small>`) : ""}
  ${r.conAltitud ? dato("Altitud mínima", `${entero(r.altitudMinima)} <small>m</small>`) : ""}
  ${dato("Dureza", `${entero(r.desnivelPorKm)} <small>m/km</small>`)}
  ${dato("Pendiente máxima", `${decimal(r.pendienteMaxima)} <small>%</small>`, "en 100 m")}
  ${dato("Recorrido", esc(TIPOS_RECORRIDO[r.tipoRecorrido] || r.tipoRecorrido))}
  ${dato("Tiempo", tiempo.valor, tiempo.nota)}
</dl>`;

  const practicos = [
    r.parking ? ["Salida y aparcamiento", esc(r.parking)] : null,
    r.epoca ? ["Mejor época", esc(r.epoca)] : null,
    r.superficie ? ["Superficie", esc(r.superficie)] : null,
    r.agua ? ["Agua", esc(r.agua)] : null,
    r.fecha ? ["Ruta registrada el", esc(fechaLarga(r.fecha) || r.fecha)] : null,
  ].filter(Boolean);

  const contenido = `
<article class="ruta">
  <div class="contenedor">
    <nav class="migas"><a href="${base}">Rutas</a> <span aria-hidden="true">›</span> <span>${esc(r.nombre)}</span></nav>
    <header class="ruta-cabecera">
      <div>
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

    ${stats}
  </div>

  <div class="contenedor">
    <section class="bloque">
      <h2>Mapa</h2>
      <div class="mapa-envoltorio">
        <div id="mapa" class="mapa" data-slug="${esc(r.slug)}"></div>
      </div>
    </section>

    ${
      r.conAltitud
        ? `<section class="bloque">
      <h2>Altimetría</h2>
      <p class="bloque-nota">Pasa el cursor (o el dedo) por el perfil para ver el punto exacto en el mapa. El color del borde indica la pendiente.</p>
      <div class="perfil-envoltorio">
        ${perfilSvg(r.perfil)}
        <div id="perfil-globo" class="globo" hidden></div>
      </div>
      <div class="perfil-eje-x"><span>kilómetros</span></div>
      ${leyendaPendiente()}
    </section>`
        : `<section class="bloque"><h2>Altimetría</h2><p class="aviso">Este GPX no incluye datos de altitud, así que no hay perfil ni desniveles fiables.</p></section>`
    }

    ${
      r.descripcionHtml
        ? `<section class="bloque prosa">
      <h2>La ruta</h2>
      ${r.descripcionHtml}
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
              `<button type="button" class="galeria-item" data-indice="${i}" aria-label="Ampliar foto ${
                i + 1
              }${f.pie ? `: ${esc(f.pie)}` : ""}">
            <img src="${base}fotos/${r.slug}/${encodeURIComponent(f.archivo)}" alt="${esc(
                f.pie
              )}" loading="lazy" decoding="async">
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
      <div class="rejilla pequena">${otras.map((o) => tarjeta(o, base)).join("")}</div>
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
    bbox: r.bbox,
    distancia: r.distancia,
    conAltitud: r.conAltitud,
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
