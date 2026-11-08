// Rutometro - lectura de las fichas .md (metadatos + descripcion).

/** Escapa texto para insertarlo en HTML. */
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Separa los metadatos (entre --- y ---) de la descripcion.
 * Formato de metadatos: "clave: valor", una por linea.
 * Las listas se escriben entre corchetes: "tags: [puerto, asfalto]".
 */
export function parseFicha(texto) {
  const t = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, cuerpo: t.trim() };

  const meta = {};
  const lineas = m[1].split("\n");
  let listaAbierta = null; // clave cuya lista "- ..." estamos leyendo

  for (const linea of lineas) {
    const l = linea.trim();
    if (!l || l.startsWith("#")) continue;

    // elemento de lista: "- lo que sea"
    if (listaAbierta && /^-\s+/.test(l)) {
      meta[listaAbierta].push(l.replace(/^-\s+/, "").replace(/^"|"$/g, ""));
      continue;
    }
    listaAbierta = null;

    const i = l.indexOf(":");
    if (i < 0) continue;
    const clave = l.slice(0, i).trim();
    let valor = l.slice(i + 1).trim();
    if (valor.startsWith('"') && valor.endsWith('"') && valor.length > 1) {
      valor = valor.slice(1, -1);
    }
    if (valor.startsWith("[") && valor.endsWith("]")) {
      meta[clave] = valor
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      continue;
    }
    if (valor === "") {
      // puede ser una clave vacia o el comienzo de una lista en varias lineas
      meta[clave] = [];
      listaAbierta = clave;
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(valor)) {
      meta[clave] = parseFloat(valor);
      continue;
    }
    if (valor === "true" || valor === "false") {
      meta[clave] = valor === "true";
      continue;
    }
    meta[clave] = valor;
  }
  // una "lista" que se quedo vacia era en realidad una clave sin valor
  for (const clave of Object.keys(meta)) {
    if (Array.isArray(meta[clave]) && meta[clave].length === 0) meta[clave] = "";
  }
  return { meta, cuerpo: m[2].trim() };
}

function enLinea(s) {
  // negrita, cursiva, codigo y enlaces, sobre texto ya escapado
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>'
    );
}

/**
 * Markdown reducido: titulos (## y ###), parrafos, listas con guion,
 * listas numeradas, citas con >, negrita, cursiva, codigo y enlaces.
 * Suficiente para describir una ruta; no es un markdown completo.
 */
export function markdown(texto) {
  if (!texto) return "";
  const bloques = esc(texto).split(/\n{2,}/);
  const html = [];

  for (const bloque of bloques) {
    const lineas = bloque.split("\n").filter((l) => l.trim() !== "");
    if (lineas.length === 0) continue;

    if (/^###\s+/.test(lineas[0])) {
      html.push(`<h4>${enLinea(lineas[0].replace(/^###\s+/, ""))}</h4>`);
      if (lineas.length > 1) {
        html.push(`<p>${enLinea(lineas.slice(1).join(" "))}</p>`);
      }
      continue;
    }
    if (/^##\s+/.test(lineas[0])) {
      html.push(`<h3>${enLinea(lineas[0].replace(/^##\s+/, ""))}</h3>`);
      if (lineas.length > 1) {
        html.push(`<p>${enLinea(lineas.slice(1).join(" "))}</p>`);
      }
      continue;
    }
    // Listas. Un elemento puede ocupar varias lineas: las que no empiezan
    // por marca se juntan con el elemento anterior.
    const agrupar = (marca) => {
      const items = [];
      for (const l of lineas) {
        if (marca.test(l)) items.push(l.replace(marca, ""));
        else if (items.length) items[items.length - 1] += " " + l.trim();
        else return null;
      }
      return items;
    };

    if (/^\s*[-*]\s+/.test(lineas[0])) {
      const items = agrupar(/^\s*[-*]\s+/);
      if (items) {
        html.push(`<ul>${items.map((x) => `<li>${enLinea(x)}</li>`).join("")}</ul>`);
        continue;
      }
    }
    if (/^\s*\d+[.)]\s+/.test(lineas[0])) {
      const items = agrupar(/^\s*\d+[.)]\s+/);
      if (items) {
        html.push(`<ol>${items.map((x) => `<li>${enLinea(x)}</li>`).join("")}</ol>`);
        continue;
      }
    }
    if (lineas.every((l) => /^\s*&gt;\s?/.test(l))) {
      html.push(
        `<blockquote>${enLinea(lineas.map((l) => l.replace(/^\s*&gt;\s?/, "")).join(" "))}</blockquote>`
      );
      continue;
    }
    html.push(`<p>${enLinea(lineas.join(" "))}</p>`);
  }
  return html.join("\n");
}

/** Convierte un nombre en slug para la URL. */
export function slugify(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
