#!/usr/bin/env node
// Rutometro - servidor estatico minimo para ver el sitio en local.
//   BASE=/ node src/build.mjs && node src/serve.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(path.resolve(import.meta.dirname, ".."), "dist");
const PUERTO = process.env.PORT || 4178;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".gpx": "application/gpx+xml",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const archivo = path.join(DIR, rel);
    if (!archivo.startsWith(DIR)) {
      res.writeHead(403).end("prohibido");
      return;
    }
    await stat(archivo);
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { "content-type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(await readFile(path.join(DIR, "404.html")).catch(() => "404"));
  }
}).listen(PUERTO, () => console.log(`http://localhost:${PUERTO}/`));
