# Esquema de `crochet-data.json` (Fase 1)

Todo el contenido de la app vive en [`src/data/crochet-data.json`](../src/data/crochet-data.json). El esquema se define una sola vez con Zod en [`src/lib/content/schema.ts`](../src/lib/content/schema.ts). Desde ahí salen:

- los **tipos de TypeScript**;
- la **validación en build**: un error detiene `npm run build` con la ruta exacta;
- el **JSON Schema** [`crochet-data.schema.json`](../src/data/crochet-data.schema.json), que da autocompletado y errores en vivo en VS Code (la asociación está en `.vscode/settings.json` y en la clave `"$schema"`).

> Si cambias `schema.ts`, ejecuta `npm run content:schema`. Un test falla si el JSON Schema queda desactualizado.

## Vista general

```jsonc
{
  "$schema": "./crochet-data.schema.json",
  "version": 1,
  "locale": "es",
  "levels": [ /* Ruta de 0 a 100 */ ],
  "techniques": [ /* Micro-cursos con sus pasos animados */ ],
  "tools": {
    "hooks": [ /* Tipos de aguja + perfil para el generador SVG */ ],
    "hookAnatomy": [ /* Textos de las 5 partes de la aguja */ ],
    "yarnWeights": [ /* Grosores estándar 0–7 */ ],
    "materials": [ /* Kit: aguja, hilo, tijeras… */ ]
  },
  "glossary": [ /* Abreviaturas ES / US / UK */ ],
  "projects": [ /* Amigurumis (galería de la Fase 4) */ ],
  "svgLibrary": { "shapes": { /* Trazados reutilizables entre técnicas */ } }
}
```

Todos los objetos son **estrictos**: una clave mal escrita (`"opactiy"`) es un error, no se ignora en silencio. Los `id` usan kebab-case (`punto-bajo`).

## Ruta de aprendizaje: `levels`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id`, `order` | `string`, `int` | `order` define el orden de los niveles. |
| `title`, `subtitle`, `description` | `string` | Textos de la tarjeta del nivel. |
| `range` | `[inicio, fin]` | Tramo de la ruta 0–100. Deben ser **contiguos** y terminar en 100. |
| `techniques` | `string[]` | Ids de técnicas en orden. Cada técnica va en un único nivel. |

Cada técnica dominada suma `(fin − inicio) / nº de técnicas` de su nivel.

## Técnicas: `techniques`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id`, `name` | `string` | `id` será la URL `/tecnicas/<id>` en la Fase 4. |
| `abbr` | `{ es, us?, uk? }` | Abreviatura en patrones (`pb` / `sc` / `dc`). |
| `level` | `string` | Debe coincidir con el nivel que la lista. |
| `status` | `"published" \| "draft"` | `draft` se muestra como "pronto". `published` exige pasos. |
| `summary`, `difficulty` (1–5), `estimatedMinutes` | | |
| `prerequisites` | `string[]` | Técnicas previas, para el checklist de requisitos. Se detectan ciclos. |
| `materials`, `tips`, `commonMistakes` | opcionales | |
| `stage` | `{ viewBox, hook? }` | Escenario común a todos los pasos (obligatorio si hay pasos). |
| `geometry` | `{ nombre: trazado }` | Trazados con nombre que los pasos usan como `"@nombre"`. |
| `pointSets` | `{ nombre: [[x, y, z], …] }` | Listas de puntos con nombre para los hilos continuos (`"@nombre"`). `z` es opcional (0). |
| `steps` | `Step[]` | Pasos ilimitados. |

### Paso: `steps[]`

```jsonc
{
  "id": "lazada",
  "phase": "yarn-over",          // hold · insert · yarn-over · pull-through
  "title": "Haz una lazada",
  "instruction": "Pasa la hebra de trabajo por encima de la aguja…",
  "tip": "Es la aguja la que va a buscar el hilo…",   // opcional
  "durationMs": 5000,            // a velocidad 1× (por defecto 4200)
  "scene": { "hook": { … }, "layers": [ … ], "callouts": [ … ] }
}
```

Las cuatro `phase` son los micro-movimientos que muestra el reproductor: **1 Posición**, **2 Introducir**, **3 Lazada**, **4 Tirar**.

## La escena: coordenadas y tiempo

- **Coordenadas:** unidades del `viewBox` del escenario (la cadeneta usa `[40, 16, 230, 184]`). La aguja se dibuja **horizontal, con la punta a la izquierda y la garganta hacia abajo**, como la ve una persona diestra. En los hilos, `z` es la profundidad: positivo hacia quien mira; la aguja está en `z = 0`.
- **Tiempo:** cada paso va de `0` (inicio) a `1` (final). El slider del reproductor recorre ese mismo eje.
- **Fotogramas clave:** `[momento, valor]` o `[momento, valor, "easing"]`, con momentos estrictamente crecientes. El easing se aplica al tramo que **termina** en ese fotograma (por defecto `easeInOut`). Antes del primero y después del último, el valor se mantiene.
- **Easings:** `linear`, `easeIn`, `easeOut`, `easeInOut`, `backOut`, `anticipate`, `circOut`.
- **Continuidad:** el estado final de un paso debe ser el inicial del siguiente. Así, avanzar no da saltos. Los tests lo verifican para la aguja y para el hilo.
- **Movimiento, no magia:** cuando un hilo cambia de forma, transforma la **misma capa** (morphing de `d`) en lugar de ocultar una capa y mostrar otra. Si una hebra debe moverse en tramos (por ejemplo, la parte que pasa por delante de la aguja), divide el trazado en tramos que al inicio coincidan exactamente con el hilo en reposo (subdivisión de la curva). Así no hay fundidos que parezcan un salto.

### Aguja: `scene.hook`

Hereda `stage.hook` (`type`, `tip`, `radius`) y añade la animación:

```jsonc
"hook": {
  "translate": [[0.1, [0, 0]], [0.5, [76, 0], "easeInOut"], [0.92, [0, 0], "easeInOut"]],
  "rotate": [[0, -4], [0.1, 0]],     // grados, sobre `pivot` (por defecto, la garganta)
  "opacity": [[0, 0], [0.2, 1]]
}
```

Usa `"hook": false` para un paso sin aguja. La aguja se genera con código a partir del perfil de `tools.hooks[type]`.

### Hilos continuos: `scene.strands`

**Un hilo real tiene dos puntas y nunca se corta**, así que el hilo se describe como **una sola lista de puntos 3D** por los que pasa: de la punta de la cola hasta el ovillo. La app lo dibuja como un tubo de hilo torcido (WebGL), con sombras y contorno. Para animarlo se mueven los puntos, no se cambian piezas:

```jsonc
"strands": {
  "hilo": {
    "points": [[0, "@lazada-1-4"], [0.13, "@tirar-1-1", "easeIn"], [0.53, "@tirar-1-5", "easeOut"]],
    "tone": [{ "range": [55.8, 78.8], "value": [[0, 1], [0.62, 1], [0.8, 0, "easeInOut"]], "feather": 2.5 }],
    "spacing": 5
  }
}
```

- Cada fotograma es un `pointSet` (`"@nombre"`) o una lista en línea de puntos `[x, y, z]`. **Todos los fotogramas deben tener el mismo número de puntos**: el punto 17 es siempre el mismo trocito de hilo, que se desplaza.
- **Profundidad:** `z` decide qué pasa por encima en cada cruce, píxel a píxel; no hace falta partir el hilo en capas. Lo que queda detrás de la aguja se intuye a través del metal. Dos tramos que se cruzan deben estar separados en `z` al menos el grosor del hilo (7).
- **`spacing`:** material entre puntos consecutivos (por defecto 5). Ancla la torsión de las hebras al hilo: cuando el hilo se mueve, las hebras viajan con él.
- **`freeStart`:** el primer punto es una punta libre y se remata redondeada (por defecto `true`).
- **`tone`:** tramos activos (amarillos), en índices de punto (admiten decimales). `value` va de 0 (azul) a 1 (amarillo), fijo o animado; `feather` funde los bordes (en puntos, 1.5 por defecto).
  - `mode: "sweep"` (por defecto): al encenderse, el amarillo **recorre** el tramo desde `range[0]` hacia `range[1]`, en el sentido del hilo (de la cola al ovillo); al apagarse, se borra en el mismo sentido. Así se ve por dónde fluye el hilo y nunca queda a medio tono.
  - `mode: "fade"`: todo el tramo se funde a la vez.

La lección de cadeneta usa un hilo de 132 puntos y 11 pasos: la cola, el aro, la aguja que entra, la lazada y el nudo corredizo, dos cadenetas y el recuento. Sus coordenadas las calcula una herramienta de autoría opcional en [`scripts/authoring/`](../scripts/authoring/cadeneta.ts): un "esqueleto" articulado (nudo, eslabones, bucle, lazada) que reparte el material del hilo, separa los cruces en profundidad, limita la curvatura al grosor del hilo y garantiza que cada paso empieza donde acabó el anterior. Se ejecuta con `npx tsx scripts/authoring/cadeneta.ts` y reescribe los `pointSets` y los pasos de la técnica en el JSON. La app solo lee el JSON: se puede editar a mano igual que cualquier otra técnica.

### Capas: `scene.layers[]`

Guías, manos y anillos de atención (trazados SVG). Se dibujan en orden: las de `depth: "back"` van **detrás** de la aguja y el resto **delante**, por encima del hilo 3D.

| Campo | Valor | Para qué |
| --- | --- | --- |
| `id` | `string` | Único dentro del paso. |
| `role` | `yarn` · `guide` · `hand` · `focus` | Trazo con aspecto de hilo (solo para ilustraciones sueltas: el hilo de la lección es el `strand`), flecha guía, silueta de dedo o anillo de atención. |
| `depth` | `back` · `front` | Delante o detrás de la aguja (por defecto `front`). |
| `translucent` | `boolean` | Tramo físicamente oculto (se ve por transparencia). |
| `attach` | `"hook"` | La capa se mueve con la aguja (la hebra en la garganta). |
| `d` | trazado · `"@nombre"` · pista | Geometría. Con varios trazados hay **morphing**. |
| `draw` | `0–1` · pista · `{ from, to, ease? }` | Parte visible del trazo: el hilo "se dibuja". |
| `trim` | `0–1` · pista | Recorta desde el inicio: la hebra que se va. |
| `opacity` | `0–1` · pista | |
| `translate` | `[x, y]` · pista | Desplaza la capa (p. ej. la cadena que baja). |
| `active` | `0–1` · pista | **Solo hilo:** 0 = hilo base azul, 1 = hilo activo amarillo. |
| `marker` | `arrow` · `dot` | Punta que viaja con el extremo del trazo. |

**Reglas del morphing:** todos los trazados de una pista `d` deben tener **los mismos comandos en el mismo orden y la misma cantidad de números**. Por ejemplo, un bucle `"M x y C x y, x y, x y"` se transforma en un eslabón con la misma forma de comandos. El validador avisa si no coinciden.

### Etiquetas: `scene.callouts[]`

```jsonc
{ "id": "logro", "text": "¡1 cadeneta!", "at": [168, 159], "placement": "right", "tone": "success", "show": { "from": 0.84 } }
```

`placement`: `top` · `bottom` · `left` · `right`. `align`: `start` · `center` · `end`. `tone`: `info` · `success` · `warning`. `show`: ventana visible (`to` es opcional). Se pintan en HTML sobre el SVG, así se leen bien en móvil.

## Herramientas: `tools`

- **`hooks[]`:** `id`, `name`, `aka`, `material` (`aluminio` · `acero` · `bambu`), `description`, `bestFor`, `sizesMm` y `profile`. El **perfil** controla el generador SVG en múltiplos del radio del cuerpo: `headRadius`, `neckRadius`, `tipLength`, `lipLength`, `throatDepth`, `throatLength`, `shaftLength`, `grip { length, halfWidth }` y `handle { style: rod | sleeve, length, radius }`.
- **`hookAnatomy[]`:** textos de `punta`, `garganta`, `cuerpo`, `apoyo` y `mango`. Las zonas las calcula el generador.
- **`yarnWeights[]`:** sistema estándar del Craft Yarn Council: `cyc` (0–7), `name`, `aka`, `hookMm` (`[mín, máx | null]`), `uses`, `amigurumi` y `strandWidth` (grosor visual).
- **`materials[]`:** `icon` es uno de `hook`, `yarn`, `scissors`, `needle`, `marker`, `stuffing`, `eyes` o `pins`.

## Glosario y proyectos

- **`glossary[]`:** `term`, `abbr { es, us, uk }`, `us`, `uk`, `aliases` (variantes regionales), `definition` y `technique?`.
- **`projects[]`** (Fase 4): `requirements { materials[], techniques[] }` alimenta el checklist ("¿dominas el anillo mágico?" → micro-curso). Los `steps` son vueltas del patrón (`section`, `round`, `instruction`, `stitchCount`, `technique`) con `scene` opcional. Sin escena, se reutilizará la animación de la técnica.

## Receta: añadir una técnica nueva sin tocar React

1. Añade la técnica a `techniques` con `status: "draft"` y su `id` en `levels[n].techniques`. Ya aparece en la ruta como "pronto".
2. Define `stage.viewBox` y `stage.hook`. Describe el hilo como **un solo** `strand`, con `pointSets` 3D para cada fase (mismo número de puntos): la profundidad `z` resuelve los cruces. Las flechas y anillos de ayuda pueden ser trazados `d` en `geometry`.
3. Escribe los pasos en orden de micro-movimiento. Copia la escena final de un paso como punto de partida del siguiente.
4. Ejecuta `npm test`. El validador señala referencias rotas, morphing incompatible, tramos fuera del hilo o saltos de la aguja y del hilo entre pasos.
5. Cambia `status` a `"published"`. El reproductor la consume tal cual.

Para depurar coordenadas: `npm run dev`, abre la lección y arrastra el slider al momento que quieras revisar.
