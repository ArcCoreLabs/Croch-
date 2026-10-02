import { z } from "zod";
import { HOOK_MATERIALS, HOOK_PART_IDS } from "@/lib/svg/hook-geometry";

/**
 * Esquema ÚNICO del contenido de la app (`src/data/crochet-data.json`).
 *
 * - Los tipos de TypeScript se infieren de aquí (`z.infer`).
 * - El JSON Schema para autocompletado en el editor se genera desde aquí
 *   (`npm run content:schema`).
 * - El contenido se valida en build: un JSON mal formado nunca llega a producción.
 *
 * Todo objeto es "estricto": una clave mal escrita (p. ej. `opactiy`) es un error.
 */

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------

export const PHASES = ["hold", "insert", "yarn-over", "pull-through"] as const;
export type Phase = (typeof PHASES)[number];

export const EASINGS = ["linear", "easeIn", "easeOut", "easeInOut", "backOut", "anticipate", "circOut"] as const;
export type EaseName = (typeof EASINGS)[number];

export const LAYER_ROLES = ["yarn", "guide", "hand", "focus"] as const;
export type LayerRole = (typeof LAYER_ROLES)[number];

export const CALLOUT_TONES = ["info", "success", "warning"] as const;
export const CALLOUT_PLACEMENTS = ["top", "bottom", "left", "right"] as const;
export const CALLOUT_ALIGNS = ["start", "center", "end"] as const;

export const MATERIAL_ICONS = [
  "hook",
  "yarn",
  "scissors",
  "needle",
  "marker",
  "stuffing",
  "eyes",
  "pins",
] as const;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa un identificador en minúsculas con guiones (kebab-case).");

const text = z.string().trim().min(1);
const unit = z.number().min(0).max(1);
const point = z.tuple([z.number(), z.number()]);
const ease = z.enum(EASINGS);

/**
 * Datos de trazado SVG, o referencia a una geometría con nombre: `"@bucle-frente"`.
 * Las referencias se buscan primero en `technique.geometry` y luego en `svgLibrary`.
 */
const pathData = z.string().trim().min(1);

/** Lista de puntos [x, y] por los que pasa un hilo continuo (de la cola al ovillo). */
const pointList = z.array(point).min(2);
/** Lista de puntos en línea o referencia a `technique.pointSets` (`"@nombre"`). */
const pointsValue = z.union([z.string().regex(/^@/, 'Usa "@nombre" para referenciar un pointSet.'), pointList]);

/** Fotograma clave compacto: `[momento, valor]` o `[momento, valor, easing]`. */
function keyframe<T extends z.ZodType>(value: T) {
  return z.union([z.tuple([unit, value]), z.tuple([unit, value, ease])]);
}

/**
 * Pista de animación: lista de fotogramas clave ordenados por `momento`
 * (0 = inicio del paso, 1 = final). El easing de un fotograma se aplica al
 * tramo que TERMINA en él. Antes del primero y después del último el valor se
 * mantiene.
 */
function track<T extends z.ZodType>(value: T) {
  return z
    .array(keyframe(value))
    .min(1)
    .superRefine((frames, ctx) => {
      for (let i = 1; i < frames.length; i++) {
        if (frames[i][0] <= frames[i - 1][0]) {
          ctx.addIssue({
            code: "custom",
            path: [i, 0],
            message: `Los momentos deben ser estrictamente crecientes (${frames[i - 1][0]} → ${frames[i][0]}).`,
          });
        }
      }
    });
}

/** Valor fijo o animado. */
function animatable<T extends z.ZodType>(value: T) {
  return z.union([value, track(value)]);
}

export const drawWindowSchema = z.strictObject({
  from: unit,
  to: unit,
  ease: ease.optional(),
});

// ---------------------------------------------------------------------------
// Escena del reproductor
// ---------------------------------------------------------------------------

export const layerSchema = z.strictObject({
  id: slug.describe("Identificador único de la capa dentro del paso."),
  role: z
    .enum(LAYER_ROLES)
    .describe("yarn = hilo · guide = flecha/guía · hand = silueta de dedo · focus = anillo de atención."),
  depth: z.enum(["back", "front"]).optional().describe("Delante o detrás de la aguja. Por defecto: front."),
  translucent: z.boolean().optional().describe("Tramo físicamente oculto: se dibuja con transparencia."),
  attach: z.literal("hook").optional().describe("La capa viaja pegada a la aguja (p. ej. la hebra en la garganta)."),
  d: animatable(pathData)
    .optional()
    .describe('Trazado SVG fijo, referencia "@nombre" o morphing [[momento, trazado], …] (mismos comandos en todos).'),
  strand: slug.optional().describe("Hilo continuo (id de scene.strands) del que esta capa dibuja un tramo."),
  range: z
    .tuple([z.number().int().min(0), z.number().int().min(1)])
    .optional()
    .describe("Tramo del hilo [desde, hasta] en índices de punto. Tramos contiguos encajan sin costura."),
  draw: z
    .union([unit, track(unit), drawWindowSchema])
    .optional()
    .describe('Fracción visible del trazado (0–1). Atajo: { "from": 0.1, "to": 0.4 } lo dibuja de 0 a 1.'),
  trim: animatable(unit).optional().describe("Recorta desde el inicio del trazado (0–1): la hebra que se va."),
  opacity: animatable(unit).optional().describe("Opacidad 0–1, fija o animada."),
  translate: animatable(point).optional().describe("Desplazamiento [x, y] en unidades del viewBox."),
  active: animatable(unit).optional().describe("Solo hilo: 0 = hilo base (azul), 1 = hilo activo (amarillo)."),
  activeFrom: animatable(unit)
    .optional()
    .describe("Solo tramos de hilo: tono al inicio del tramo. El color pasa en degradado de `activeFrom` a `active`."),
  marker: z.enum(["arrow", "dot"]).optional().describe("Punta que viaja con el extremo del trazo mientras se dibuja."),
  label: z.string().optional().describe("Descripción breve para depuración."),
})
  .superRefine((layer, ctx) => {
    const hasPath = layer.d !== undefined;
    const hasStrand = layer.strand !== undefined;
    if (hasPath === hasStrand) {
      ctx.addIssue({ code: "custom", path: ["d"], message: "Define `d` o bien `strand` + `range` (uno de los dos)." });
    }
    if (hasStrand && !layer.range) {
      ctx.addIssue({ code: "custom", path: ["range"], message: "Una capa de hilo continuo necesita `range`." });
    }
    if (layer.activeFrom !== undefined && !hasStrand) {
      ctx.addIssue({ code: "custom", path: ["activeFrom"], message: "`activeFrom` solo se usa en tramos de hilo (`strand`)." });
    }
    if (layer.range && layer.range[0] >= layer.range[1]) {
      ctx.addIssue({ code: "custom", path: ["range"], message: "`range` debe ir de un índice menor a uno mayor." });
    }
  });
export type LayerInput = z.infer<typeof layerSchema>;

export const calloutSchema = z.strictObject({
  id: slug,
  text: text.describe("Texto breve de la etiqueta (HTML nítido sobre la escena)."),
  at: point.describe("Punto de anclaje [x, y] en coordenadas del viewBox."),
  placement: z.enum(CALLOUT_PLACEMENTS).optional().describe("Lado del ancla donde aparece. Por defecto: top."),
  align: z.enum(CALLOUT_ALIGNS).optional().describe("Alineación horizontal respecto al ancla (top/bottom)."),
  tone: z.enum(CALLOUT_TONES).optional(),
  show: z
    .strictObject({ from: unit, to: unit.optional() })
    .describe("Ventana visible dentro del paso (0–1). Sin `to`, queda visible hasta el final."),
});
export type CalloutInput = z.infer<typeof calloutSchema>;

export const hookActorSchema = z.strictObject({
  type: slug.optional().describe("Tipo de aguja (id de tools.hooks)."),
  tip: point.optional().describe("Posición [x, y] del ápice de la punta en reposo."),
  radius: z.number().positive().optional().describe("Radio del cuerpo en unidades del viewBox."),
  pivot: point.optional().describe("Centro de rotación [x, y]. Por defecto, la garganta."),
  translate: animatable(point).optional().describe("Desplazamiento [x, y] de la aguja, fijo o animado."),
  rotate: animatable(z.number()).optional().describe("Rotación en grados alrededor del pivote."),
  opacity: animatable(unit).optional(),
});
export type HookActorInput = z.infer<typeof hookActorSchema>;

export const sceneSchema = z.strictObject({
  hook: z
    .union([z.literal(false), hookActorSchema])
    .optional()
    .describe("Animación de la aguja en este paso (hereda stage.hook). false = sin aguja."),
  strands: z
    .record(
      slug,
      z.strictObject({
        points: z
          .union([pointsValue, track(pointsValue)])
          .describe('Puntos del hilo, fijos o animados: [[momento, "@pointSet"], …]. Mismo nº de puntos en todos.'),
      }),
    )
    .optional()
    .describe("Hilos continuos de la escena. Las capas dibujan tramos de ellos con `strand` + `range`."),
  layers: z.array(layerSchema).describe("Capas en orden de dibujo: primero las de atrás."),
  callouts: z.array(calloutSchema).optional(),
});
export type SceneInput = z.infer<typeof sceneSchema>;
export type StrandInput = NonNullable<SceneInput["strands"]>[string];

export const stepSchema = z.strictObject({
  id: slug,
  phase: z.enum(PHASES).describe("Micro-movimiento: hold (posición) · insert · yarn-over (lazada) · pull-through."),
  title: text,
  instruction: text,
  tip: text.optional(),
  durationMs: z.number().int().min(800).max(20000).optional().describe("Duración a velocidad 1×. Por defecto 4200."),
  scene: sceneSchema,
});
export type StepInput = z.infer<typeof stepSchema>;

export const stageSchema = z.strictObject({
  viewBox: z
    .tuple([z.number(), z.number(), z.number().positive(), z.number().positive()])
    .describe("[minX, minY, ancho, alto] del escenario."),
  hook: hookActorSchema.optional().describe("Configuración de aguja común a todos los pasos."),
});

// ---------------------------------------------------------------------------
// Técnicas, niveles, herramientas
// ---------------------------------------------------------------------------

const abbreviationsSchema = z.strictObject({
  es: z.string(),
  us: z.string().optional(),
  uk: z.string().optional(),
});

export const techniqueSchema = z
  .strictObject({
    id: slug,
    name: text,
    abbr: abbreviationsSchema.optional(),
    level: slug,
    status: z.enum(["published", "draft"]),
    summary: text,
    difficulty: z.number().int().min(1).max(5),
    estimatedMinutes: z.number().int().positive(),
    prerequisites: z.array(slug),
    materials: z.array(slug).optional(),
    tips: z.array(text).optional(),
    commonMistakes: z.array(text).optional(),
    stage: stageSchema.optional(),
    /** Geometrías con nombre reutilizables en los pasos (`"@nombre"`). */
    geometry: z.record(z.string(), pathData).optional(),
    /** Listas de puntos con nombre para los hilos continuos (`"@nombre"`). */
    pointSets: z.record(z.string(), pointList).optional(),
    steps: z.array(stepSchema),
  })
  .superRefine((technique, ctx) => {
    if (technique.status === "published" && technique.steps.length === 0) {
      ctx.addIssue({ code: "custom", path: ["steps"], message: "Una técnica publicada necesita al menos un paso." });
    }
    if (technique.steps.length > 0 && !technique.stage) {
      ctx.addIssue({ code: "custom", path: ["stage"], message: "Define `stage.viewBox` para técnicas con pasos." });
    }
  });
export type TechniqueInput = z.infer<typeof techniqueSchema>;

export const levelSchema = z.strictObject({
  id: slug,
  order: z.number().int().min(0),
  title: text,
  subtitle: text,
  description: text,
  /** Tramo de la ruta "de 0 a 100" que cubre el nivel. */
  range: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  techniques: z.array(slug),
});
export type LevelInput = z.infer<typeof levelSchema>;

export const hookProfileSchema = z.strictObject({
  headRadius: z.number().positive(),
  neckRadius: z.number().positive(),
  tipLength: z.number().positive(),
  lipLength: z.number().positive(),
  throatDepth: z.number().positive(),
  throatLength: z.number().positive(),
  shaftLength: z.number().positive(),
  grip: z.strictObject({ length: z.number().positive(), halfWidth: z.number().positive() }),
  handle: z.strictObject({
    style: z.enum(["rod", "sleeve"]),
    length: z.number().positive(),
    radius: z.number().positive(),
  }),
});

export const hookTypeSchema = z.strictObject({
  id: slug,
  name: text,
  aka: z.array(text),
  material: z.enum(HOOK_MATERIALS),
  description: text,
  bestFor: text,
  /** Rango de tamaños habituales en milímetros. */
  sizesMm: z.tuple([z.number().positive(), z.number().positive()]),
  profile: hookProfileSchema,
});
export type HookTypeInput = z.infer<typeof hookTypeSchema>;

export const hookPartSchema = z.strictObject({
  id: z.enum(HOOK_PART_IDS),
  name: text,
  role: text,
  description: text,
});

export const yarnWeightSchema = z.strictObject({
  id: slug,
  /** Número del sistema estándar del Craft Yarn Council (0–7). */
  cyc: z.number().int().min(0).max(7),
  name: text,
  aka: z.array(text),
  /** Aguja recomendada (mm) para tejido estándar. */
  hookMm: z.tuple([z.number().positive(), z.number().positive().nullable()]),
  uses: text,
  amigurumi: text,
  /** Grosor visual del hilo en la ilustración (unidades SVG). */
  strandWidth: z.number().positive(),
});
export type YarnWeightInput = z.infer<typeof yarnWeightSchema>;

export const materialSchema = z.strictObject({
  id: slug,
  name: text,
  description: text,
  icon: z.enum(MATERIAL_ICONS),
  essential: z.boolean(),
});

export const glossaryTermSchema = z.strictObject({
  id: slug,
  term: text,
  abbr: abbreviationsSchema,
  us: text,
  uk: text,
  aliases: z.array(text).optional(),
  definition: text,
  technique: slug.optional(),
});
export type GlossaryTermInput = z.infer<typeof glossaryTermSchema>;

// ---------------------------------------------------------------------------
// Proyectos (consumidos en la Fase 4: galería y reproductor de patrones)
// ---------------------------------------------------------------------------

export const projectStepSchema = z.strictObject({
  id: slug,
  /** Parte del amigurumi: "Cabeza", "Cuerpo", "Orejas"… */
  section: text,
  /** Vuelta o fila: "V1", "V2-V4"… */
  round: z.string().optional(),
  instruction: text,
  /** Puntos al terminar la vuelta. */
  stitchCount: z.number().int().positive().optional(),
  /** Técnica que se practica (su animación se reutiliza si no hay `scene`). */
  technique: slug.optional(),
  durationMs: z.number().int().min(800).max(20000).optional(),
  scene: sceneSchema.optional(),
});

export const projectSchema = z
  .strictObject({
    id: slug,
    name: text,
    style: text,
    status: z.enum(["published", "draft"]),
    difficulty: z.number().int().min(1).max(5),
    level: slug,
    summary: text,
    /** Icono estilizado generado por código (Fase 4). */
    icon: z.strictObject({ shape: slug, palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1) }),
    finishedSizeCm: z.number().positive(),
    yarnWeight: slug,
    hookMm: z.number().positive(),
    requirements: z.strictObject({
      materials: z.array(z.strictObject({ material: slug, detail: z.string().optional() })),
      techniques: z.array(slug),
    }),
    stage: stageSchema.optional(),
    geometry: z.record(z.string(), pathData).optional(),
    pointSets: z.record(z.string(), pointList).optional(),
    steps: z.array(projectStepSchema),
  })
  .superRefine((project, ctx) => {
    if (project.status === "published" && project.steps.length === 0) {
      ctx.addIssue({ code: "custom", path: ["steps"], message: "Un proyecto publicado necesita pasos." });
    }
  });
export type ProjectInput = z.infer<typeof projectSchema>;

// ---------------------------------------------------------------------------
// Documento raíz
// ---------------------------------------------------------------------------

export const crochetDataSchema = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(1),
  locale: z.string(),
  levels: z.array(levelSchema).min(1),
  techniques: z.array(techniqueSchema).min(1),
  tools: z.strictObject({
    hooks: z.array(hookTypeSchema).min(1),
    hookAnatomy: z.array(hookPartSchema).length(HOOK_PART_IDS.length),
    yarnWeights: z.array(yarnWeightSchema).min(1),
    materials: z.array(materialSchema),
  }),
  glossary: z.array(glossaryTermSchema),
  projects: z.array(projectSchema),
  svgLibrary: z.strictObject({
    shapes: z.record(z.string(), pathData),
  }),
});

export type CrochetData = z.infer<typeof crochetDataSchema>;
