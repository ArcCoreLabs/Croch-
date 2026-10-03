# Arquitectura de croché!! (Fase 1)

## Principios

1. **Cero archivos visuales externos.** No hay imágenes, vídeos ni modelos 3D en archivos. Agujas, manos, iconos de croché, el logo y hasta el favicon se generan con código SVG; el hilo del reproductor es un tubo 3D que se construye en código y se pinta con WebGL. Lucide React solo se usa para los iconos de la interfaz.
2. **El contenido manda.** Teoría, herramientas, técnicas y cada fotograma de las animaciones viven en `src/data/crochet-data.json`. Para añadir lecciones o pasos se edita el JSON, no React.
3. **SPA estática.** `output: "export"` genera HTML, CSS y JS en `out/`. Sin servidor, sin recargas: la navegación es del lado del cliente.
4. **Mobile-first y accesible.** El diseño parte de 360 px. Los controles se manejan con teclado y la app respeta `prefers-reduced-motion` y `prefers-color-scheme`.

## Flujo de datos

```
crochet-data.json ──► Zod (schema.ts) ──► validate.ts ──► compile.ts ──► selectors.ts
   (autoría)            forma + tipos     referencias      pistas Track<T>   view-models
                                                                                │  props (RSC)
                                                                                ▼
                               Componentes cliente: <SvgStepPlayer />, anatomía, ruta…
                                                                                │
                                MotionValue `progress` (0–1) ──► useTransform ──► SVG (aguja, guías)
                                                             └──► YarnCanvas ──► WebGL (hilo 3D)
```

- **Build (servidor):** `src/lib/content/index.ts` (marcado `server-only`) importa el JSON, lo valida una única vez y lo compila. Un error de contenido detiene el build con la ruta exacta del fallo.
- **Cliente:** solo recibe datos ya compilados como props. Ni Zod ni el JSON completo viajan al navegador.
- **Animación:** cada paso es una función pura de `progress ∈ [0, 1]`. El botón Reproducir anima ese número con `animate()` de Framer Motion. El slider lo fija a mano. Las capas derivan de él su trazo (`pathLength`), su forma (morphing de `d`), su opacidad, su color y su posición. React no se re-renderiza en cada fotograma: solo lo hace el slider, que está aislado.
- **Hilo 3D:** en cada fotograma, `YarnCanvas` interpola los puntos (x, y, z) del hilo, construye la curva y un tubo de 12 lados (`src/lib/yarn`) y lo pinta con WebGL2 en varias pasadas: mapa de sombras, la aguja como volumen invisible (tapa lo que pasa por detrás, que se intuye a través del metal), la sombra del hilo sobre la aguja, el hilo con hebras torcidas y sombras, y un contorno en pantalla donde salta la profundidad, que marca cada cruce "encima / debajo". Sin WebGL hay un respaldo SVG plano.

## Estructura de carpetas

```
.
├── docs/
│   ├── ARCHITECTURE.md          # este documento (Fase 1)
│   ├── DATA_SCHEMA.md           # esquema del JSON y guía de autoría (Fase 1)
│   ├── SETUP.md                 # comandos de instalación (Fase 2)
│   └── CONTRIBUTING.md
├── scripts/
│   ├── generate-content-schema.ts   # Zod → JSON Schema para el editor
│   └── authoring/                   # (opcional) "esqueleto" que calcula el hilo 3D de la cadeneta
│       ├── cadeneta.ts              # generador: escribe pointSets y pasos en el JSON
│       ├── cadeneta-steps.ts        # guion: pasos, fotogramas clave, tramos activos, etiquetas
│       ├── cadeneta-rig.ts          # piezas en reposo: nudo, eslabones, bucle en la aguja
│       ├── slipknot-rig.ts          # nudo corredizo desde la punta visible
│       ├── chain-rig.ts             # lazada y tirar de cada cadeneta
│       ├── pull-rig.ts              # tirar a través de un bucle (común a ambos)
│       └── yarn-kit.ts              # vectores, curvas, material, holgura y curvatura
├── src/
│   ├── app/                     # App Router (rutas = páginas de la SPA)
│   │   ├── layout.tsx           # fuentes, metadatos, favicon SVG en línea
│   │   ├── page.tsx             # Onboarding (Fase 3)
│   │   ├── globals.css          # Tailwind v4 + paleta + tokens claro/oscuro
│   │   ├── proyectos/           # ⏳ Fase 4: galería de amigurumis
│   │   │   └── [slug]/          # ⏳ Fase 4: proyecto + checklist + reproductor
│   │   └── tecnicas/[slug]/     # ⏳ Fase 4: micro-curso de cada técnica
│   ├── components/
│   │   ├── player/              # MOTOR: <SvgStepPlayer /> y sus piezas
│   │   │   ├── SvgStepPlayer.tsx    # API pública del reproductor
│   │   │   ├── use-playback.ts      # orquestación (MotionValue + animate)
│   │   │   ├── playback.ts          # máquina de estados pura (testeada)
│   │   │   ├── StepStage.tsx        # escenario por capas (SVG + lienzo WebGL + etiquetas)
│   │   │   ├── YarnCanvas.tsx       # hilo 3D (WebGL2) y su respaldo SVG
│   │   │   ├── SceneLayer.tsx       # una capa: hilo/guía/mano/foco
│   │   │   ├── HookActor.tsx        # aguja animada y capas pegadas a ella
│   │   │   ├── CalloutOverlay.tsx   # etiquetas HTML sobre la escena
│   │   │   ├── ProgressScrubber.tsx # slider 0–100 %
│   │   │   ├── PlayerControls.tsx   # anterior · reproducir/pausar · siguiente
│   │   │   ├── PhaseTrack.tsx       # 4 micro-movimientos
│   │   │   ├── StageDefs.tsx        # degradados metálicos, patrón, brillo
│   │   │   ├── stage-theme.ts       # colores de alto contraste
│   │   │   └── motion-hooks.ts      # useTrack, useSvgAttribute
│   │   ├── onboarding/          # secciones de la página de inicio
│   │   ├── illustrations/       # aguja paramétrica, hebra, iconos de croché
│   │   ├── brand/               # logo (ovillo) y favicon
│   │   ├── ui/                  # piezas genéricas (Section…)
│   │   └── gallery/             # ⏳ Fase 4: tarjetas e iconos de amigurumis
│   ├── data/
│   │   ├── crochet-data.json        # ★ TODO el contenido
│   │   └── crochet-data.schema.json # generado: autocompletado en el editor
│   └── lib/
│       ├── content/             # esquema Zod, validación, compilador, selectores
│       ├── player/              # formato compilado (types.ts) y lectura de pistas (track.ts)
│       ├── yarn/                # hilo 3D: curva, tubo, tono, volumen de la aguja, renderizador WebGL2
│       ├── svg/                 # generador de agujas, utilidades de trazados
│       └── progress/            # progreso del alumno (localStorage) y ruta 0–100
├── tests/                       # Vitest: contenido, compilador, geometría, reproductor
└── .vscode/settings.json        # asocia el JSON con su esquema
```

## Decisiones técnicas

| Decisión | Motivo |
| --- | --- |
| **Zod como única fuente del esquema** | Tipos TS inferidos, validación en build y JSON Schema generado para el editor desde un mismo archivo. |
| **Validación semántica aparte** (`validate.ts`) | Comprueba lo que un esquema no ve: ids únicos, referencias, ciclos de prerrequisitos, geometrías `@nombre` y trazados compatibles para morphing. |
| **Compilar escenas en build** | El cliente recibe pistas uniformes (`Track<T>`), así que no valida ni interpreta atajos. |
| **Progreso como `MotionValue`** | 60 fps sin re-renderizar React. El slider, reproducir/pausar y el avance automático controlan un único número. |
| **Atributo SVG `transform` escrito a mano** | Motion convierte `transform` en CSS, que no admite `rotate(ángulo cx cy)`. La aguja necesita girar sobre su garganta. |
| **Etiquetas en HTML, no en `<text>`** | Texto nítido y legible en móvil, sin depender de la escala del SVG. |
| **Hilo continuo por puntos 3D** (`scene.strands`) | Un hilo real tiene dos puntas: se describe como una lista de puntos (x, y, z) de la cola al ovillo y se anima moviéndolos. Cada punto es siempre el mismo trocito de material, así las hebras torcidas viajan con el hilo. |
| **WebGL2 para el hilo** (`gl-renderer.ts`) | En un nudo, qué tramo va encima cambia a lo largo del cruce. Con profundidad por píxel cada cruce se resuelve solo, con sombras y relieve, sin cortar el hilo en piezas. La aguja sigue siendo SVG. |
| **Tramos activos que barren** (`tone.ts`) | El amarillo recorre el hilo en el sentido del flujo (de la cola al ovillo) al encenderse y al apagarse: se ve por dónde va el hilo y nunca aparece a medio tono. |
| **Aguja paramétrica** (`hook-geometry.ts`) | Todos los perfiles comparten estructura, así que se puede interpolar entre tipos de aguja. La anatomía y el reproductor usan el mismo generador. |
| **Progreso en `localStorage`** + `useSyncExternalStore` | Sin cuentas ni servidor. Sin desajustes de hidratación y sincronizado entre pestañas. |
| **`output: "export"`** | Despliegue en cualquier hosting estático. Las rutas dinámicas de la Fase 4 se generarán desde el JSON con `generateStaticParams`. |

## Hoja de ruta

- **Fase 1 ✅** Estructura y esquema del JSON.
- **Fase 2 ✅** Inicialización y dependencias.
- **Fase 3 ✅** `<SvgStepPlayer />`, animación de la cadeneta y Onboarding. Hilo 3D en WebGL: nudo corredizo desde la punta visible y dos cadenetas.
- **Fase 4 ⏳** Galería de amigurumis, navegación global, página por técnica y checklist de requisitos ("¿dominas el anillo mágico?" → micro-curso).
