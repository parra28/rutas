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

### 3. Marca los puntos de interés (opcional)

Dentro de la ficha `.md`, en los metadatos:

```yaml
puntos:
  - 0 | parking | Aparcamiento junto al área recreativa
  - 14,2 | fuente | Fuente del pueblo, potable todo el año
  - 38 | desayuno | Bar de la plaza, abre a las 8
  - 52,5 | tienda | Supermercado, último avituallamiento
  - 68 | peligro | Bajada con gravilla suelta en las curvas
  - 79 | mirador | Se ve toda la sierra
```

**Formato: `dónde | tipo | lo que quieras contar`**

- **Dónde**: el kilómetro de la ruta (`14,2` o `14.2`). El programa calcula
  solo las coordenadas exactas sobre el trazado. También puedes dar
  coordenadas directamente, pero **con punto decimal**: `38.0258,-6.2197`.
  Esa distinción importa: `14,2` es el kilómetro 14,2, y `38.0258,-6.2197`
  son coordenadas.
- **Tipo**, uno de estos:

  | Tipo | Para qué | También se acepta |
  |---|---|---|
  | `parking` | Dónde dejar el coche | `aparcamiento`, `salida` |
  | `fuente` | Agua potable | `agua` |
  | `desayuno` | Bar, café, avituallamiento | `bar`, `cafe`, `cafeteria` |
| `comida` | Parada a comer | `restaurante`, `almuerzo`, `comer` |
  | `tienda` | Supermercado, panadería | `super`, `supermercado` |
  | `taller` | Taller de bicis | `mecanico`, `bici` |
  | `mirador` | Vistas, cima | `vistas`, `cima` |
  | `peligro` | Tramo delicado | `cuidado`, `ojo` |
  | `cruce` | Desvío fácil de fallar | `desvio` |
  | `foto` | Sitio bonito para parar | |
  | `otro` | Cualquier otra cosa | |

- **El texto** es libre y puede llevar comas.

Los puntos salen en tres sitios a la vez: como marcadores en el mapa (se
pueden ocultar desde el selector de capas), como marcas sobre el perfil de
altimetría, y como lista ordenada por kilómetro en la ficha.

Si el GPX ya trae waypoints, se añaden también sin que hagas nada.

### 4. Añade fotos (opcional)

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

### 5. Añade un vídeo (opcional)

En los metadatos, con la URL de Instagram o de YouTube:

```yaml
video: https://www.instagram.com/reel/DIt3B5xI-kx/
```

Funciona con reels y publicaciones de Instagram y con vídeos y shorts de
YouTube. El vídeo sale centrado, y **no se carga hasta que el visitante
pulsa el botón**: así la página no pide nada a Instagram ni a YouTube solo
por abrirla, y carga más rápido. Debajo queda siempre un enlace para abrirlo
en la plataforma.

Los vídeos de YouTube arrancan solos y en silencio al pulsar. Los de
Instagram no: su incrustado no admite ningún parámetro de reproducción
automática, así que hay que darle al play dentro del propio recuadro.

### 6. Sube los cambios

```bash
git add rutas/ && git commit -m "Añadir ruta: Navacerrada por La Barranca" && git push
```

GitHub Actions regenera y publica la web sola, en un par de minutos.

---

## Qué se calcula solo y qué escribes tú

**Lo calcula el programa leyendo el GPX** — no lo escribas en la ficha:

distancia · desnivel positivo y negativo · altitud máxima y mínima ·
pendiente media y máxima · tipo de recorrido (circular, lineal o ida y
vuelta) · perfil de altimetría · trazado del mapa · miniatura · tiempo en
movimiento y tiempo total si el GPX lleva marcas de tiempo, y si no, un
tiempo estimado.

La ficha muestra cinco cifras: distancia, desnivel positivo, tiempo en
movimiento, tiempo total y tipo de recorrido. El resto de datos calculados
se usan en el perfil y en los filtros.

**Lo escribes tú en el `.md`** — una máquina no puede saberlo:

| Campo | Obligatorio | Qué es |
|---|---|---|
| `nombre` | recomendado | Título de la ruta. Si falta, se usa el del GPX. |
| `zona` | recomendado | Alimenta el filtro de zonas de la portada. |
| `provincia` | no | Se muestra junto a la zona. |
| `bici` | recomendado | `carretera`, `gravel`, `btt` o `cicloturismo`. |
| `dificultad` | recomendado | Del 1 al 5. Tu criterio, no el del programa. |
| `fecha` | no | `AAAA-MM-DD`. Ordena la portada por "más recientes". |
| `desnivel` | no | Desnivel positivo real en metros, si no te fías del calculado. |
| `parking` | no | Dónde dejar el coche. |
| `epoca` | no | Mejor época del año. |
| `superficie` | no | Reparto de asfalto, pista y sendero. |
| `agua` | no | Fuentes y avituallamiento. |
| `tags` | no | Etiquetas libres; entran en el buscador. |
| `puntos` | no | Lista de puntos de interés. Ver más arriba. |
| `avisos` | no | Peligros o cosas a tener en cuenta. Sale destacado. |
| `video` | no | URL de un reel de Instagram o un vídeo de YouTube. |
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
src/lib/puntos.mjs  Puntos de interés: tipos y colocación sobre la ruta
src/lib/video.mjs   Reconoce las URL de vídeo y cómo incrustarlas
src/serve.mjs       Servidor local para pruebas
assets/             CSS y JavaScript del navegador
  minimapas.js      Convierte la silueta de cada tarjeta en un mapa real
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

1. **El desnivel se suaviza, y el filtro está calibrado.** El track se
   remuestrea cada 10 m y la altitud pasa por una media móvil de **60 m**
   antes de sumar las subidas. Sin suavizar nada, el ruido del sensor infla
   el desnivel; con una ventana grande se comen las subidas cortas reales,
   que en terreno ondulado son la mayor parte del acumulado.

   Ese valor no está puesto a ojo: se eligió comparando contra dos rutas con
   desnivel real conocido. Con la ventana de 300 m que había antes, el
   cálculo se quedaba un 21% corto. Con los 60 m actuales:

   | Ruta | Real | Calculado | Error |
   |---|---|---|---|
   | Cuenca Minera | 2.428 m | 2.464 m | +1,5% |
   | Venta Culebrín | 2.730 m | 2.641 m | −3,3% |

   Los errores van en sentidos opuestos, que es lo que cabe esperar cuando
   el filtro es razonable y lo que queda son diferencias de cada grabación.
   No hay una ventana que acierte en las dos a la vez: a Cuenca Minera le
   iría mejor una más grande y a Venta Culebrín una más pequeña.

   Por eso, cuando sepas el valor bueno, fíjalo en la ficha:

   ```yaml
   desnivel: 2428
   ```

   Ese número manda sobre el calculado, y el build avisa si los dos se
   separan más de un 10%.
2. **El tiempo estimado es orientativo.** Sale de una velocidad base según el
   tipo de bici, penalizada por la pendiente de cada tramo. Está calibrado con
   una sola ruta real, así que tómalo como una aproximación. Si el GPX trae
   marcas de tiempo, se muestra el tiempo real en movimiento en su lugar.

### Mapas

En la ficha de ruta hay cinco capas: CyclOSM, OpenStreetMap, OpenTopoMap, IGN
topográfico y ortofoto PNOA del IGN. La atribución de cada una aparece en el
propio mapa.

Las tarjetas de la portada llevan un mapa en miniatura con el trazado. Se monta
como mejora progresiva: el HTML trae la silueta en SVG, así que la página se ve
al instante y también funciona sin JavaScript, y el mapa se carga encima solo
cuando la tarjeta entra en pantalla. Así no se piden teselas de rutas que nadie
va a mirar.
