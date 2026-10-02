# Arquitectura de croché!! (Fase 1)

## Principios

1. **Cero archivos visuales externos.** No hay imágenes, vídeos ni modelos 3D. Agujas, hilos, manos, iconos de croché, el logo y hasta el favicon se generan con código SVG. Lucide React solo se usa para los iconos de la interfaz.
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
                                MotionValue `progress` (0–1) ──► useTransform ──► SVG
```

- **Build (servidor):** `src/lib/content/index.ts` (marcado `server-only`) importa el JSON, lo valida una única vez y lo compila. Un error de contenido detiene el build con la ruta exacta del fallo.
- **Cliente:** solo recibe datos ya compilados como props. Ni Zod ni el JSON completo viajan al navegador.
- **Animación:** cada paso es una función pura de `progress ∈ [0, 1]`. El botón Reproducir anima ese número con `animate()` de Framer Motion. El slider lo fija a mano. Las capas derivan de él su trazo (`pathLength`), su forma (morphing de `d`), su opacidad, su color y su posición. React no se re-renderiza en cada fotograma: solo lo hace el slider, que está aislado.

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
│   └── authoring/cadeneta.ts        # (opcional) calcula los puntos del hilo de la cadeneta
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
│   │   │   ├── StepStage.tsx        # escenario SVG (fondo, capas, aguja)
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
│       ├── player/types.ts      # formato compilado que consume el reproductor
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
| **Hilo continuo por puntos** (`strand.ts`) | Un hilo real tiene dos puntas: se describe como una lista de puntos y se anima moviéndolos. Las capas son tramos de la misma curva (sin costuras), y la profundidad delante/detrás se resuelve por tramos. |
| **Aguja paramétrica** (`hook-geometry.ts`) | Todos los perfiles comparten estructura, así que se puede interpolar entre tipos de aguja. La anatomía y el reproductor usan el mismo generador. |
| **Progreso en `localStorage`** + `useSyncExternalStore` | Sin cuentas ni servidor. Sin desajustes de hidratación y sincronizado entre pestañas. |
| **`output: "export"`** | Despliegue en cualquier hosting estático. Las rutas dinámicas de la Fase 4 se generarán desde el JSON con `generateStaticParams`. |

## Hoja de ruta

- **Fase 1 ✅** Estructura y esquema del JSON.
- **Fase 2 ✅** Inicialización y dependencias.
- **Fase 3 ✅** `<SvgStepPlayer />`, animación de la cadeneta y Onboarding.
- **Fase 4 ⏳** Galería de amigurumis, navegación global, página por técnica y checklist de requisitos ("¿dominas el anillo mágico?" → micro-curso).
