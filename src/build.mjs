#!/usr/bin/env node
// Rutometro - generador del sitio.
//
//   node src/build.mjs            -> genera dist/ para https://parra28.github.io/rutas/
//   BASE=/ node src/build.mjs     -> genera dist/ para abrirlo en local
//
// Lee cada .gpx de rutas/ junto a su .md del mismo nombre, calcula las
// metricas y escribe el sitio completo en dist/.

import { readdir, readFile, writeFile, mkdir, cp, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { parseGpx, analizar, gpxLigero, crearLocalizador } from "./lib/gpx.mjs";
import { resolverPuntos, puntosDelGpx } from "./lib/puntos.mjs";
import { parseFicha, markdown, slugify, esc } from "./lib/content.mjs";
import { miniatura } from "./lib/thumb.mjs";
import { paginaIndice, paginaRuta } from "./lib/render.mjs";
import { TIPOS_BICI, km, entero } from "./lib/formato.mjs";

const RAIZ = path.resolve(import.meta.dirname, "..");
const DIR_RUTAS = path.join(RAIZ, "rutas");
const DIR_SALIDA = path.join(RAIZ, "dist");
const BASE = process.env.BASE || "/rutas/";

const avisos = [];
const errores = [];

function aviso(msg) {
  avisos.push(msg);
  console.warn(`  ! ${msg}`);
}

const EXT_FOTO = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
const PESO_AVISO = 1_500_000; // 1,5 MB por foto

/**
 * Busca las fotos de una ruta en rutas/<nombre-base>/.
 * El orden es alfabetico, asi que conviene numerarlas: 01-..., 02-...
 * Si el nombre lleva " - ", lo que va detras se usa como pie de foto.
 */
async function cargarFotos(nombreBase) {
  const carpeta = path.join(DIR_RUTAS, nombreBase);
  if (!existsSync(carpeta)) return [];
  const entradas = (await readdir(carpeta))
    .filter((f) => EXT_FOTO.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

  const fotos = [];
  for (const archivo of entradas) {
    const info = await stat(path.join(carpeta, archivo));
    if (info.size > PESO_AVISO) {
      aviso(
        `${nombreBase}/${archivo} pesa ${pesoLegible(info.size)}: reducela antes de publicarla ` +
          `(1600 px de ancho basta de sobra para la web)`
      );
    }
    const sinExt = archivo.slice(0, -path.extname(archivo).length);
    const guion = sinExt.indexOf(" - ");
    fotos.push({
      archivo,
      origen: path.join(carpeta, archivo),
      pie: guion > -1 ? sinExt.slice(guion + 3).trim() : "",
      peso: info.size,
    });
  }
  return fotos;
}

function pesoLegible(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ------------------------------------------------------------------ recopilar

async function cargarRutas() {
  if (!existsSync(DIR_RUTAS)) {
    throw new Error(`no existe la carpeta ${DIR_RUTAS}`);
  }
  const ficheros = (await readdir(DIR_RUTAS))
    .filter((f) => f.toLowerCase().endsWith(".gpx"))
    .sort();

  if (ficheros.length === 0) {
    aviso("no hay ningun .gpx en rutas/: el sitio se generara vacio");
  }

  const rutas = [];
  for (const fichero of ficheros) {
    const nombreBase = fichero.replace(/\.gpx$/i, "");
    const rutaGpx = path.join(DIR_RUTAS, fichero);
    try {
      const xml = await readFile(rutaGpx, "utf8");
      const { nombreGpx, points, waypoints } = parseGpx(xml);

      const rutaMd = path.join(DIR_RUTAS, `${nombreBase}.md`);
      let meta = {};
      let cuerpo = "";
      if (existsSync(rutaMd)) {
        const ficha = parseFicha(await readFile(rutaMd, "utf8"));
        meta = ficha.meta;
        cuerpo = ficha.cuerpo;
      } else {
        aviso(`${fichero} no tiene ficha ${nombreBase}.md: se usan solo los datos del GPX`);
      }

      const bici = String(meta.bici || "").toLowerCase();
      if (bici && !TIPOS_BICI[bici]) {
        aviso(`${nombreBase}: tipo de bici desconocido "${bici}" (validos: ${Object.keys(TIPOS_BICI).join(", ")})`);
      }

      const metricas = analizar(points, { bici });
      const original = await stat(rutaGpx);

      const nombre = String(meta.nombre || nombreGpx || nombreBase).trim();
      const slug = slugify(meta.slug || nombre || nombreBase);

      let dificultad = Number(meta.dificultad) || 0;
      if (dificultad && (dificultad < 1 || dificultad > 5)) {
        aviso(`${nombreBase}: dificultad "${meta.dificultad}" fuera de 1-5, se ignora`);
        dificultad = 0;
      }

      const ligero = gpxLigero(points, nombre);
      const fotos = await cargarFotos(nombreBase);

      // puntos de interes: los de la ficha, mas los waypoints del propio GPX
      const localizador = crearLocalizador(points);
      const puntos = resolverPuntos(meta.puntos, localizador, (m) =>
        aviso(`${nombreBase}: ${m}`)
      ).concat(puntosDelGpx(waypoints, localizador));
      puntos.sort((a, b) => a.metros - b.metros);

      rutas.push({
        ...metricas,
        numPuntos: ligero.puntos,
        puntosOriginales: metricas.numPuntos,
        slug,
        nombre,
        ficheroGpx: fichero,
        zona: meta.zona || "",
        provincia: meta.provincia || "",
        bici: TIPOS_BICI[bici] ? bici : "",
        dificultad,
        tags: Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [],
        parking: meta.parking || "",
        epoca: meta.epoca || "",
        superficie: meta.superficie || "",
        agua: meta.agua || "",
        fecha: meta.fecha || "",
        avisos: meta.avisos || "",
        tipoRecorrido: meta.recorrido || metricas.tipoRecorrido,
        descripcionHtml: markdown(cuerpo),
        waypoints,
        puntos,
        fotos,
        pesoGpx: pesoLegible(Buffer.byteLength(ligero.xml)),
        pesoOriginal: pesoLegible(original.size),
        gpxLigero: ligero.xml,
        miniatura: miniatura(metricas.trazado),
      });
      console.log(
        `  + ${nombre}  ${km(metricas.distancia)} km / ${entero(metricas.desnivelPositivo)} m D+  ` +
          `(GPX ${pesoLegible(original.size)} -> ${pesoLegible(Buffer.byteLength(ligero.xml))}, ` +
          `${entero(metricas.numPuntos)} -> ${entero(ligero.puntos)} puntos)  -> /ruta/${slug}/`
      );
    } catch (e) {
      errores.push(`${fichero}: ${e.message}`);
      console.error(`  x ${fichero}: ${e.message}`);
    }
  }

  // slugs repetidos
  const vistos = new Map();
  for (const r of rutas) {
    if (vistos.has(r.slug)) {
      const n = vistos.get(r.slug) + 1;
      vistos.set(r.slug, n);
      aviso(`slug repetido "${r.slug}": se renombra a "${r.slug}-${n}"`);
      r.slug = `${r.slug}-${n}`;
    } else {
      vistos.set(r.slug, 1);
    }
  }

  // orden por defecto: fecha descendente, luego nombre
  rutas.sort((a, b) => {
    if (a.fecha && b.fecha && a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    if (a.fecha && !b.fecha) return -1;
    if (!a.fecha && b.fecha) return 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
  rutas.forEach((r, i) => (r.orden = i));

  return rutas;
}

// -------------------------------------------------------------------- escribir

async function escribir(ruta, contenido) {
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(ruta, contenido);
}

async function generar() {
  console.log(`\nRutometro - generando el sitio (base "${BASE}")\n`);

  const rutas = await cargarRutas();

  await rm(DIR_SALIDA, { recursive: true, force: true });
  await mkdir(DIR_SALIDA, { recursive: true });

  const zonas = [...new Set(rutas.map((r) => r.zona).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  // indice
  await escribir(path.join(DIR_SALIDA, "index.html"), paginaIndice({ base: BASE, rutas, zonas }));

  // una pagina por ruta
  for (const r of rutas) {
    const otras = rutas
      .filter((o) => o.slug !== r.slug)
      .sort((a, b) => {
        // las mas cercanas primero (distancia entre puntos de salida)
        const d = (x) => Math.hypot(x.inicio.lat - r.inicio.lat, x.inicio.lon - r.inicio.lon);
        return d(a) - d(b);
      })
      .slice(0, 3);
    await escribir(
      path.join(DIR_SALIDA, "ruta", r.slug, "index.html"),
      paginaRuta({ base: BASE, r, otras })
    );
    await escribir(path.join(DIR_SALIDA, "gpx", `${r.slug}.gpx`), r.gpxLigero);
    for (const foto of r.fotos) {
      await mkdir(path.join(DIR_SALIDA, "fotos", r.slug), { recursive: true });
      await cp(foto.origen, path.join(DIR_SALIDA, "fotos", r.slug, foto.archivo));
    }
  }

  // assets
  await cp(path.join(RAIZ, "assets"), path.join(DIR_SALIDA, "assets"), { recursive: true });

  // 404
  await escribir(
    path.join(DIR_SALIDA, "404.html"),
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Página no encontrada · Rutómetro</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${BASE}assets/styles.css"></head><body><main class="contenedor" style="padding:4rem 0;text-align:center"><h1>Esta página no existe</h1><p><a class="boton principal" href="${BASE}">Ver todas las rutas</a></p></main></body></html>`
  );

  // sitemap y robots
  const host = "https://parra28.github.io";
  const urls = [`${host}${BASE}`, ...rutas.map((r) => `${host}${BASE}ruta/${r.slug}/`)];
  await escribir(
    path.join(DIR_SALIDA, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );
  await escribir(
    path.join(DIR_SALIDA, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${host}${BASE}sitemap.xml\n`
  );

  // resumen
  const totalFotos = rutas.reduce((a, r) => a + r.fotos.length, 0);
  const totalPuntos = rutas.reduce((a, r) => a + r.puntos.length, 0);
  console.log(
    `\n  ${rutas.length} ruta(s), ${zonas.length} zona(s)` +
      (totalFotos ? `, ${totalFotos} foto(s)` : "") +
      (totalPuntos ? `, ${totalPuntos} punto(s) de interés` : "")
  );
  if (avisos.length) console.log(`  ${avisos.length} aviso(s)`);
  if (errores.length) {
    console.error(`\n  ${errores.length} ruta(s) no se han podido procesar:`);
    for (const e of errores) console.error(`    - ${e}`);
    process.exitCode = 1;
  }
  console.log(`\n  listo -> dist/\n`);
}

generar().catch((e) => {
  console.error(`\nError: ${e.message}\n`);
  process.exit(1);
});
