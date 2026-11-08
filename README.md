# Rutómetro

Catálogo de rutas en bici con mapa, perfil de altimetría y descarga del GPX.
Web estática, sin servidor ni base de datos, publicada en
**https://parra28.github.io/rutas/**

---

## Añadir una ruta

Tres pasos. No hay que tocar nada del código.

### 1. Copia el GPX

Deja el archivo en la carpeta `rutas/`. El nombre del archivo da igual, pero
conviene que sea descriptivo y sin acentos ni espacios:

```
rutas/navacerrada-por-la-barranca.gpx
```

### 2. Crea la ficha

Un archivo `.md` **con el mismo nombre** que el GPX:

```
rutas/navacerrada-por-la-barranca.md
```

Con este contenido:

```markdown
---
nombre: Puerto de Navacerrada por La Barranca
zona: Sierra de Guadarrama
provincia: Madrid
bici: gravel
dificultad: 4
fecha: 2026-05-12
parking: Aparcamiento de La Barranca, junto al área recreativa
epoca: De abril a noviembre
superficie: 60% asfalto, 40% pista
agua: Fuente en el km 8 y bar en Navacerrada
tags: [puerto, circular]
avisos: "El último kilómetro tiene gravilla suelta en las curvas."
---

## Cómo es

Aquí escribes lo que quieras contar de la ruta: por dónde va, qué tramos
son duros, dónde parar. Admite títulos con `##`, listas con guion,
**negrita**, *cursiva* y [enlaces](https://ejemplo.com).

- La subida empieza de verdad en el km 6.
- Ojo al paso canadiense del km 14.
```

### 3. Añade fotos (opcional)

Crea una carpeta **con el mismo nombre** que el GPX y mete dentro las imágenes:

```
rutas/navacerrada-por-la-barranca/
  01 - Salida desde el aparcamiento.jpg
  02 - El falso llano del km 9.jpg
  03.jpg
```

- Se ordenan por nombre de archivo: numéralas con `01`, `02`, `03`.
- Lo que escribas **después de " - "** se usa como pie de foto. Si no pones
  guion, la foto sale sin pie.
- Formatos: `.jpg`, `.png`, `.webp`, `.avif`.
- La primera foto es la que sale en la tarjeta de la portada y la que se ve
  al compartir el enlace por WhatsApp o Telegram.
- **Redúcelas antes de subirlas**: 1600 px de ancho sobra para la web. El build
  avisa de cualquier foto que pase de 1,5 MB. No se redimensionan solas, así
  que una foto de 5 MB se publica tal cual y la ficha tarda en cargar.

Si una ruta no tiene carpeta de fotos, la tarjeta muestra la silueta del
trazado, como hasta ahora.

### 4. Sube los cambios

```bash
git add rutas/ && git commit -m "Añadir ruta: Navacerrada por La Barranca" && git push
```

GitHub Actions regenera y publica la web sola, en un par de minutos.

---

## Qué se calcula solo y qué escribes tú

**Lo calcula el programa leyendo el GPX** — no lo escribas en la ficha:

distancia · desnivel positivo y negativo · altitud máxima y mínima ·
pendiente media y máxima · metros de desnivel por kilómetro ·
tipo de recorrido (circular, lineal o ida y vuelta) · perfil de altimetría ·
trazado del mapa · miniatura · tiempo estimado · tiempo real si el GPX
lleva marcas de tiempo.

**Lo escribes tú en el `.md`** — una máquina no puede saberlo:

| Campo | Obligatorio | Qué es |
|---|---|---|
| `nombre` | recomendado | Título de la ruta. Si falta, se usa el del GPX. |
| `zona` | recomendado | Alimenta el filtro de zonas de la portada. |
| `provincia` | no | Se muestra junto a la zona. |
| `bici` | recomendado | `carretera`, `gravel`, `btt` o `cicloturismo`. |
| `dificultad` | recomendado | Del 1 al 5. Tu criterio, no el del programa. |
| `fecha` | no | `AAAA-MM-DD`. Ordena la portada por "más recientes". |
| `parking` | no | Dónde dejar el coche. |
| `epoca` | no | Mejor época del año. |
| `superficie` | no | Reparto de asfalto, pista y sendero. |
| `agua` | no | Fuentes y avituallamiento. |
| `tags` | no | Etiquetas libres; entran en el buscador. |
| `avisos` | no | Peligros o cosas a tener en cuenta. Sale destacado. |
| `recorrido` | no | Fuerza `circular`, `lineal` o `ida-vuelta` si la detección falla. |
| `slug` | no | Fuerza la URL de la ruta. |

Si una ruta no tiene `.md`, igual se publica: se usan solo los datos del GPX.

---

## Trabajar en local

```bash
BASE=/ node src/build.mjs && node src/serve.mjs
```

Y abre http://localhost:4178. Para generar la versión de producción:

```bash
node src/build.mjs
```

El resultado queda en `dist/`, que no se sube al repositorio: lo construye
GitHub Actions en cada push.

---

## Cómo está hecho

Sin dependencias, sin `npm install`, sin framework. Solo Node y un poco de
JavaScript en el navegador. Así añadir una ruta seguirá funcionando igual
dentro de unos años.

```
rutas/              Tus GPX y sus fichas .md  ← lo único que tocas
src/build.mjs       Lee los GPX y escribe el sitio en dist/
src/lib/gpx.mjs     Parseo del GPX y cálculo de métricas
src/lib/render.mjs  Plantillas HTML
src/lib/content.mjs Lectura de las fichas .md
src/serve.mjs       Servidor local para pruebas
assets/             CSS y JavaScript del navegador
.github/workflows/  Publicación automática en GitHub Pages
```

### El GPX que se descarga no es el que subes

Los archivos de Strava se graban a un punto por segundo y pesan varios megas
(pulso, cadencia, temperatura y marca de tiempo en cada punto). Eso no sirve
de nada a quien quiere seguir la ruta y hace la descarga muy pesada en el
móvil, así que el build genera una versión reducida:

- Solo coordenadas y altitud. Sin tiempos ni datos fisiológicos.
- Puntos reducidos con Ramer-Douglas-Peucker hasta un máximo de 3.000, que es
  lo que aceptan sin problemas los GPS de bici. El trazado no cambia a la vista.
- Ejemplo real: **6,1 MB → 129 KB**, de 18.272 a 1.973 puntos.

El archivo original se queda en `rutas/` y es el que se usa para calcular las
métricas, incluido el tiempo real en movimiento.

### Dos detalles del cálculo, por transparencia

1. **El desnivel se suaviza.** El track se remuestrea cada 10 m y la altitud
   pasa por una media móvil de 300 m antes de sumar las subidas. Sin eso, el
   ruido del GPS infla el desnivel positivo. Por el mismo motivo tus números
   pueden no coincidir con los de Strava o Wikiloc: cada plataforma usa su
   propio filtro.
2. **El tiempo estimado es orientativo.** Sale de una velocidad base según el
   tipo de bici, penalizada por la pendiente de cada tramo. Está calibrado con
   una sola ruta real, así que tómalo como una aproximación. Si el GPX trae
   marcas de tiempo, se muestra el tiempo real en movimiento en su lugar.

### Mapas

Capas disponibles: CyclOSM, OpenStreetMap, OpenTopoMap, IGN topográfico y
ortofoto PNOA del IGN. La atribución de cada una aparece en el propio mapa.
