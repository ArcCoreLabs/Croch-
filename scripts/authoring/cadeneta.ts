/**
 * Herramienta de AUTORÍA (opcional) para la lección de cadeneta.
 *
 * Calcula las coordenadas del hilo continuo en cada fase y reescribe, en
 * `src/data/crochet-data.json`, los `pointSets` y la `scene` de cada paso de
 * la técnica `cadeneta`. Los textos de los pasos (título, instrucción, consejo,
 * duración) se conservan tal y como estén en el JSON.
 *
 * La app NO usa este script: solo lee el JSON. Sirve para recalcular la
 * geometría si se ajusta el diseño. Uso: `npx tsx scripts/authoring/cadeneta.ts`
 *
 * Modelo: UN solo hilo de 51 puntos, de la punta de la cola (índice 0) al
 * ovillo (índice 50, fuera de la escena):
 *   0–3   cola · 4–10 nudo corredizo (un lazo apretado del propio hilo)
 *   11–20 bloque A · 21–30 bloque B · 31–40 bloque C  (conector + 9 puntos de bucle)
 *   41–50 hebra hasta el ovillo
 * Cada bucle sube por la izquierda (delante de la aguja), pasa por arriba y baja
 * por la derecha (detrás). En la lazada, el tramo que viene de la labor entra en
 * la garganta por debajo, sube por delante de la cabeza y el tramo del ovillo sale
 * por arriba: al tirar, las dos patas atraviesan el bucle viejo sin cruzarse. Al
 * hacer una cadeneta, el bloque siguiente pasa de ser hebra de trabajo a ser el
 * bucle de la aguja y el anterior se convierte en eslabón: el hilo nunca se
 * corta, solo se mueven sus puntos.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type P = [number, number];
type Frame = [number, string] | [number, string, string];
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const DATA_PATH = fileURLToPath(new URL("../../src/data/crochet-data.json", import.meta.url));
const POINT_COUNT = 51;
const LINK_STEP = 26;
const KNOT_Y = 158;
const LINK_Y = 159;
const blockBase = (block: number) => 11 + 10 * block;

const r2 = (n: number) => Math.round(n * 100) / 100;
const pt = (x: number, y: number): P => [r2(x), r2(y)];
const mid = (a: P, b: P): P => pt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
const shift = (points: P[], dx: number, dy = 0): P[] => points.map(([x, y]) => pt(x + dx, y + dy));

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

const tail = (yk: number): P[] => [pt(143, yk + 70), pt(140, yk + 50), pt(142, yk + 30), pt(145, yk + 16)];
const knot = (yk: number): P[] => [
  pt(146, yk + 7), pt(143, yk + 1), pt(144, yk - 5), pt(150, yk - 8), pt(155, yk - 6), pt(158, yk), pt(155, yk + 7),
];

/** Bucle alrededor del cuerpo de la aguja: sube por delante (izq.), baja por detrás (der.). */
const HOOK_LOOP: P[] = [[141, 150], [139, 137], [139, 121], [143, 108], [150, 103], [157, 108], [161, 121], [161, 137], [159, 150]];
/** Bucle del nudo corredizo, de pie y holgado, antes de meter la aguja. */
const FREE_LOOP: P[] = [[139, 150], [134, 134], [134, 114], [140, 100], [150, 95], [160, 100], [166, 114], [166, 134], [161, 150]];
/** Bucle viejo arrastrado por la cabeza de la aguja al salir por la punta. */
const DRAGGED_LOOP: P[] = [[141, 150], [139, 137], [141, 121], [146, 108], [154, 104], [163, 110], [167, 124], [165, 138], [159, 150]];
/** Bucle viejo ya suelto, cerrado alrededor de la pata que va al ovillo. */
const CLOSED_LOOP: P[] = [[143, 150], [141, 141], [142, 132], [146, 125], [152, 123], [158, 126], [161, 134], [161, 143], [158, 150]];
const link = (yc: number): P[] => [
  pt(142, yc + 12), pt(139, yc + 4), pt(139, yc - 5), pt(143, yc - 13), pt(150, yc - 16),
  pt(157, yc - 13), pt(161, yc - 5), pt(161, yc + 4), pt(158, yc + 12),
];

/** Lazada alzada: la hebra pasa por encima de la cabeza, aún sin tocarla. */
const LIFTED_BLOCK: P[] = [[147, 141], [131, 124], [118, 108], [113, 102], [108, 98], [103, 95], [98, 91], [92, 86], [85, 80], [77, 73]];
/**
 * Lazada terminada: el tramo que viene de la labor pasa bajo la aguja, entra en
 * la garganta, sube por delante de la cabeza y sale por arriba hacia el ovillo.
 */
const WRAP_BLOCK: P[] = [[146, 146], [124, 138], [107, 124], [106, 117], [107, 110], [110, 104], [107, 98], [101, 91], [93, 83], [83, 74]];
/** Aguja retrasada 76: la parte enganchada viaja con la cabeza; la pata del ovillo cruza el bucle viejo. */
const PULLED_BLOCK: P[] = [
  [165, 144], [175, 133],
  ...shift(WRAP_BLOCK.slice(2, 6), 76),
  [190, 108], [176, 112], [162, 120], [149, 127],
];
/** Igual, con el bucle viejo cerrado: la pata del ovillo baja un poco al apretarse. */
const CLOSING_BLOCK: P[] = [
  [165, 144], [175, 133],
  ...shift(WRAP_BLOCK.slice(2, 6), 76),
  [190, 109], [177, 115], [163, 125], [151, 133],
];

const BALL: P = [8, 14];
const REST_ROUTE: P[] = [[152, 146], [144, 140], [136, 132], [128, 123], [120, 113], [110, 102], [98, 90], [82, 75], [62, 57], [40, 37], BALL];
const LIFTED_ROUTE: P[] = [[64, 61], [48, 47], [30, 30], BALL];
const WRAP_ROUTE: P[] = [[68, 60], [50, 45], [30, 29], BALL];
const PULLED_ROUTE: P[] = [[139, 129], [130, 124], [120, 114], [108, 101], [92, 85], [70, 64], [44, 40], BALL];
const CLOSING_ROUTE: P[] = [[140, 133], [131, 126], [121, 115], [108, 101], [92, 85], [70, 64], [44, 40], BALL];

// ---------------------------------------------------------------------------
// Curvas: muestreo Catmull-Rom (misma curva que dibuja la app)
// ---------------------------------------------------------------------------

function catmull(points: P[], segment: number, t: number): P {
  const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))];
  const [p0, p1, p2, p3] = [at(segment - 1), at(segment), at(segment + 1), at(segment + 2)];
  const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  const u = 1 - t;
  const f = (a: number, b: number, c: number, d: number) => u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  return [f(p1[0], c1[0], c2[0], p2[0]), f(p1[1], c1[1], c2[1], p2[1])];
}

function densify(points: P[], samplesPerSegment = 24): P[] {
  const out: P[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    for (let s = 1; s <= samplesPerSegment; s++) out.push(catmull(points, i, s / samplesPerSegment));
  }
  return out;
}

function polylineLength(points: P[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

/** `count` puntos equidistantes sobre la curva suave start → guía (sin incluir start). */
function resample(start: P, guide: P[], count: number): P[] {
  const dense = densify([start, ...guide]);
  const lengths = [0];
  for (let i = 1; i < dense.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = lengths[lengths.length - 1];
  const out: P[] = [];
  let j = 1;
  for (let k = 1; k <= count; k++) {
    const target = (total * k) / count;
    while (j < dense.length - 1 && lengths[j] < target) j++;
    const span = lengths[j] - lengths[j - 1] || 1;
    const t = (target - lengths[j - 1]) / span;
    out.push(pt(dense[j - 1][0] + (dense[j][0] - dense[j - 1][0]) * t, dense[j - 1][1] + (dense[j][1] - dense[j - 1][1]) * t));
  }
  out[out.length - 1] = [...guide[guide.length - 1]] as P;
  return out;
}

// ---------------------------------------------------------------------------
// Estados del hilo
// ---------------------------------------------------------------------------

interface StateOptions {
  /** Cadenetas terminadas (eslabones bajo la aguja). */
  links: number;
  /** Forma del bucle del bloque `links` (el que está en la aguja). */
  hookLoop: P[];
  /** Bloque siguiente colocado a mano (lazada); si falta, todo es hebra en reposo. */
  nextBlock?: P[];
  route: P[];
}

function buildState({ links, hookLoop, nextBlock, route }: StateOptions): P[] {
  const yk = KNOT_Y + LINK_STEP * links;
  const points: P[] = [...tail(yk), ...knot(yk)];
  const append = (shape: P[]) => {
    points.push(mid(points[points.length - 1], shape[0]), ...shape);
  };
  for (let j = 0; j < links; j++) append(link(LINK_Y + LINK_STEP * (links - 1 - j)));
  append(hookLoop);
  if (nextBlock) points.push(...nextBlock);
  points.push(...resample(points[points.length - 1], route, POINT_COUNT - points.length));
  if (points.length !== POINT_COUNT) throw new Error(`El hilo tiene ${points.length} puntos (se esperaban ${POINT_COUNT}).`);
  return points;
}

const pointSets: Record<string, P[]> = {
  "libre-0": buildState({ links: 0, hookLoop: FREE_LOOP, route: REST_ROUTE }),
  "reposo-0": buildState({ links: 0, hookLoop: HOOK_LOOP, route: REST_ROUTE }),
  "lazada-alzada-0": buildState({ links: 0, hookLoop: HOOK_LOOP, nextBlock: LIFTED_BLOCK, route: LIFTED_ROUTE }),
  "lazada-0": buildState({ links: 0, hookLoop: HOOK_LOOP, nextBlock: WRAP_BLOCK, route: WRAP_ROUTE }),
  "tirar-0": buildState({ links: 0, hookLoop: DRAGGED_LOOP, nextBlock: PULLED_BLOCK, route: PULLED_ROUTE }),
  "cierre-0": buildState({ links: 0, hookLoop: CLOSED_LOOP, nextBlock: CLOSING_BLOCK, route: CLOSING_ROUTE }),
  "reposo-1": buildState({ links: 1, hookLoop: HOOK_LOOP, route: REST_ROUTE }),
  "lazada-alzada-1": buildState({ links: 1, hookLoop: HOOK_LOOP, nextBlock: LIFTED_BLOCK, route: LIFTED_ROUTE }),
  "lazada-1": buildState({ links: 1, hookLoop: HOOK_LOOP, nextBlock: WRAP_BLOCK, route: WRAP_ROUTE }),
  "tirar-1": buildState({ links: 1, hookLoop: DRAGGED_LOOP, nextBlock: PULLED_BLOCK, route: PULLED_ROUTE }),
  "cierre-1": buildState({ links: 1, hookLoop: CLOSED_LOOP, nextBlock: CLOSING_BLOCK, route: CLOSING_ROUTE }),
  "reposo-2": buildState({ links: 2, hookLoop: HOOK_LOOP, route: REST_ROUTE }),
};

// ---------------------------------------------------------------------------
// Capas: tramos del mismo hilo
// ---------------------------------------------------------------------------

/**
 * Detrás de la aguja, en orden de hilo ("lo posterior queda encima"): así cada
 * bucle nuevo pasa por encima de la mitad trasera del anterior. Los bloques se
 * parten en dos para que los cruces de un mismo bucle queden en capas distintas.
 */
const BACK: { id: string; range: [number, number]; block: number }[] = [
  { id: "hilo-cola-nudo", range: [0, 10], block: -1 },
  { id: "hilo-a", range: [10, 20], block: 0 },
  { id: "hilo-b", range: [20, 30], block: 1 },
  { id: "hilo-c", range: [30, 40], block: 2 },
  { id: "hilo-ovillo", range: [40, 50], block: 3 },
];
/** Mitad delantera de cada bloque (subida izquierda + arriba), del más nuevo al más viejo. */
const frontRange = (block: number): [number, number] => [blockBase(block) + 2, blockBase(block) + 5];
const FRONT_ORDER = [2, 1, 0];

const ACTIVE_IN: Json = [[0, 0], [0.14, 1]];
const ACTIVE_OUT: Json = [[0.93, 1], [0.99, 0]];

interface StrandLayersOptions {
  /** Bloque que está en la aguja durante el paso (los posteriores son hebra de trabajo). */
  hookBlock: number;
  /** Tono de la hebra de trabajo: fijo (base) o animado. */
  workingTone?: Json;
  /** Bloques con mitad delantera visible y su opacidad (para cambios de profundidad invisibles). */
  front?: { block: number; opacity?: Json }[];
  /** Dibujo progresivo de todo el hilo (paso 1). */
  drawWindow?: [number, number];
  drawSet?: string;
}

function arcLength(points: P[], [from, to]: [number, number]): number {
  return polylineLength(densify(points).slice(from * 24, to * 24 + 1));
}

function strandLayers({ hookBlock, workingTone, front = [], drawWindow, drawSet }: StrandLayersOptions): Json[] {
  const layers: Json[] = [];
  const isWorking = (block: number) => block > hookBlock;
  let drawCursor = drawWindow?.[0] ?? 0;
  const totalLength = drawWindow && drawSet ? arcLength(pointSets[drawSet], [0, POINT_COUNT - 1]) : 1;

  for (const segment of BACK) {
    const layer: Record<string, Json> = { id: segment.id, role: "yarn", depth: "back", strand: "hilo", range: segment.range };
    if (workingTone !== undefined && isWorking(segment.block)) layer.active = workingTone;
    if (drawWindow && drawSet) {
      const share = (arcLength(pointSets[drawSet], segment.range) / totalLength) * (drawWindow[1] - drawWindow[0]);
      layer.draw = { from: r2(drawCursor), to: r2(drawCursor + share), ease: "linear" };
      drawCursor += share;
    }
    layers.push(layer);
    // Cuello: donde la hebra de trabajo sale de la labor, el color cambia en
    // degradado sobre el mismo hilo (sin borde que parezca un corte).
    if (workingTone !== undefined && segment.block === hookBlock + 1) {
      const neck = blockBase(hookBlock) + 9;
      layers.push({
        id: "hilo-cuello",
        role: "yarn",
        depth: "back",
        strand: "hilo",
        range: [neck - 2, neck + 2],
        activeFrom: 0,
        active: workingTone,
      });
    }
  }
  for (const block of FRONT_ORDER) {
    const config = front.find((f) => f.block === block);
    if (!config) continue;
    const layer: Record<string, Json> = {
      id: `hilo-${"abc"[block]}-delante`,
      role: "yarn",
      strand: "hilo",
      range: frontRange(block),
    };
    if (workingTone !== undefined && isWorking(block)) layer.active = workingTone;
    if (config.opacity !== undefined) layer.opacity = config.opacity;
    layers.push(layer);
  }
  return layers;
}

const strand = (points: string | Frame[]): Json => ({ hilo: { points } as Json });

// ---------------------------------------------------------------------------
// Escenas de los 7 pasos
// ---------------------------------------------------------------------------

const PULL_HOOK: Json = {
  rotate: [[0, -4], [0.1, 0]],
  translate: [[0.1, [0, 0]], [0.5, [76, 0], "easeInOut"], [0.64, [76, 0]], [0.94, [0, 0], "easeInOut"]],
};

const pullFrames = (n: number): Frame[] => [
  [0.1, `@lazada-${n}`],
  [0.5, `@tirar-${n}`, "easeInOut"],
  [0.64, `@cierre-${n}`, "easeOut"],
  [0.94, `@reposo-${n + 1}`, "easeInOut"],
];

const pullExtras: Json[] = [
  { id: "foco-garganta", role: "focus", attach: "hook", d: "@anillo-garganta", opacity: [[0.44, 1], [0.52, 0]] },
  { id: "foco-cierre", role: "focus", d: "@anillo-cierre", draw: { from: 0.52, to: 0.62 }, opacity: [[0.8, 1], [0.88, 0]] },
  { id: "flecha", role: "guide", d: "@flecha-tirar", marker: "arrow", draw: { from: 0.08, to: 0.3 }, opacity: [[0.44, 1], [0.52, 0]] },
];

const scenes: Record<string, Json> = {
  sujetar: {
    hook: { translate: [[0, [300, 0]], [0.12, [300, 0]], [0.5, [140, 0], "easeOut"]], opacity: [[0.12, 0], [0.3, 1]] },
    strands: strand("@libre-0"),
    layers: [
      { id: "mano-indice", role: "hand", depth: "back", d: "@mano-indice", opacity: [[0.5, 0], [0.62, 1]] },
      { id: "mano-pinza-medio", role: "hand", depth: "back", d: "@mano-pinza-medio", opacity: [[0.56, 0], [0.7, 1]] },
      ...strandLayers({ hookBlock: 0, drawWindow: [0, 0.5], drawSet: "libre-0" }),
      { id: "mano-pinza-pulgar", role: "hand", d: "@mano-pinza-pulgar", opacity: [[0.56, 0], [0.7, 1]] },
      { id: "mano-derecha", role: "hand", d: "@mano-derecha", opacity: [[0.62, 0], [0.78, 1]] },
    ],
    callouts: [
      { id: "indice", text: "Índice: guía la hebra", at: [60, 62], placement: "bottom", align: "start", show: { from: 0.64 } },
      { id: "pinza", text: "Pulgar y medio: sujetan el nudo", at: [150, 196], placement: "bottom", show: { from: 0.74 } },
      { id: "derecha", text: "Mano derecha: como un lápiz", at: [340, 170], placement: "bottom", align: "end", show: { from: 0.84 } },
    ],
  },
  introducir: {
    hook: { translate: [[0, [140, 0]], [0.1, [140, 0]], [0.6, [0, 0], "easeInOut"]] },
    strands: strand([[0, "@libre-0"], [0.62, "@libre-0"], [0.86, "@reposo-0", "easeOut"]]),
    layers: [
      ...strandLayers({ hookBlock: 0, front: [{ block: 0 }] }),
      { id: "foco-bucle", role: "focus", d: "@anillo-bucle-libre", draw: { from: 0, to: 0.12 }, opacity: [[0.3, 1], [0.42, 0]] },
      { id: "flecha", role: "guide", d: "@flecha-introducir", marker: "arrow", draw: { from: 0.06, to: 0.3 }, opacity: [[0.5, 1], [0.62, 0]] },
    ],
    callouts: [
      { id: "meter", text: "Introduce la punta en el bucle", at: [226, 84], show: { from: 0.1, to: 0.6 } },
      { id: "ajustar", text: "Ajusta: firme, sin apretar", at: [150, 92], tone: "success", show: { from: 0.74 } },
    ],
  },
  lazada: {
    hook: { rotate: [[0.14, 0], [0.46, -4]] },
    strands: strand([[0, "@reposo-0"], [0.36, "@lazada-alzada-0", "easeInOut"], [0.66, "@lazada-0", "easeInOut"]]),
    layers: [
      ...strandLayers({ hookBlock: 0, workingTone: ACTIVE_IN, front: [{ block: 1, opacity: [[0.36, 0], [0.38, 1]] }, { block: 0 }] }),
      { id: "foco-garganta", role: "focus", attach: "hook", d: "@anillo-garganta", draw: { from: 0.68, to: 0.8 } },
      { id: "flecha", role: "guide", d: "@flecha-lazada", marker: "arrow", draw: { from: 0.38, to: 0.56 }, opacity: [[0.74, 1], [0.84, 0]] },
    ],
    callouts: [
      { id: "hebra", text: "Hebra de trabajo", at: [98, 80], placement: "right", show: { from: 0.04, to: 0.3 } },
      { id: "alzar", text: "Pasa la hebra por encima", at: [164, 84], placement: "right", show: { from: 0.3, to: 0.5 } },
      { id: "direccion", text: "De atrás hacia adelante", at: [164, 84], placement: "right", show: { from: 0.52, to: 0.78 } },
      { id: "atrapa", text: "La garganta atrapa la hebra", at: [40, 152], placement: "bottom", align: "start", show: { from: 0.8 } },
    ],
  },
  tirar: {
    hook: PULL_HOOK,
    strands: strand(pullFrames(0)),
    layers: [
      ...strandLayers({ hookBlock: 0, workingTone: ACTIVE_OUT, front: [{ block: 1 }, { block: 0 }] }),
      ...pullExtras,
    ],
    callouts: [
      { id: "tirar", text: "La garganta pasa por dentro del bucle", at: [214, 82], show: { from: 0.1, to: 0.48 } },
      { id: "cierre", text: "El bucle viejo se cierra", at: [172, 150], placement: "right", show: { from: 0.54, to: 0.84 } },
      { id: "logro", text: "¡1 cadeneta!", at: [168, 159], placement: "right", tone: "success", show: { from: 0.88 } },
    ],
  },
  "lazada-2": {
    hook: { rotate: [[0.12, 0], [0.42, -4]] },
    strands: strand([[0, "@reposo-1"], [0.32, "@lazada-alzada-1", "easeInOut"], [0.62, "@lazada-1", "easeInOut"]]),
    layers: [
      ...strandLayers({
        hookBlock: 1,
        workingTone: [[0, 0], [0.12, 1]],
        front: [{ block: 2, opacity: [[0.32, 0], [0.34, 1]] }, { block: 1 }, { block: 0 }],
      }),
      { id: "foco-garganta", role: "focus", attach: "hook", d: "@anillo-garganta", draw: { from: 0.64, to: 0.76 } },
      { id: "flecha", role: "guide", d: "@flecha-lazada", marker: "arrow", draw: { from: 0.34, to: 0.5 }, opacity: [[0.7, 1], [0.8, 0]] },
    ],
    callouts: [{ id: "lazada", text: "Lazada", at: [116, 76], show: { from: 0.3 } }],
  },
  "tirar-2": {
    hook: PULL_HOOK,
    strands: strand(pullFrames(1)),
    layers: [
      ...strandLayers({ hookBlock: 1, workingTone: ACTIVE_OUT, front: [{ block: 2 }, { block: 1 }, { block: 0 }] }),
      ...pullExtras,
    ],
    callouts: [
      { id: "cierre", text: "El bucle viejo se cierra", at: [172, 150], placement: "right", show: { from: 0.54, to: 0.84 } },
      { id: "logro", text: "¡2 cadenetas!", at: [168, 159], placement: "right", tone: "success", show: { from: 0.88 } },
    ],
  },
  contar: {
    strands: strand("@reposo-2"),
    layers: [
      ...strandLayers({ hookBlock: 2, front: [{ block: 2 }, { block: 1 }, { block: 0 }] }),
      { id: "foco-1", role: "focus", d: "@anillo-eslabon", translate: [0, 26], draw: { from: 0.08, to: 0.24 } },
      { id: "foco-2", role: "focus", d: "@anillo-eslabon", draw: { from: 0.32, to: 0.48 } },
    ],
    callouts: [
      { id: "uno", text: "1", at: [172, 185], placement: "right", tone: "success", show: { from: 0.22 } },
      { id: "dos", text: "2", at: [172, 159], placement: "right", tone: "success", show: { from: 0.46 } },
      { id: "bucle", text: "No se cuenta", at: [150, 96], tone: "warning", show: { from: 0.62 } },
      { id: "nudo", text: "Nudo: no se cuenta", at: [168, 211], placement: "right", tone: "warning", show: { from: 0.74 } },
    ],
  },
};

/** Trazados de guía que siguen usando `d` (flechas y anillos de atención). */
const GEOMETRY: Record<string, string> = {
  "flecha-introducir": "M 268 92 L 184 92",
  "flecha-lazada": "M 132 100 C 126 82, 100 82, 98 100",
  "flecha-tirar": "M 168 90 L 258 90",
  "anillo-bucle-libre": "M 150 84 C 180 84, 180 162, 150 162 C 120 162, 120 84, 150 84",
  "anillo-eslabon": "M 150 136 C 176 136, 176 182, 150 182 C 124 182, 124 136, 150 136",
  "anillo-garganta": "M 107 111 C 121.67 111, 121.67 133, 107 133 C 92.33 133, 92.33 111, 107 111",
  "anillo-cierre": "M 151 112 C 181 112, 181 162, 151 162 C 121 162, 121 112, 151 112",
};

// ---------------------------------------------------------------------------
// Escritura en el JSON (solo se reemplaza el objeto de la técnica)
// ---------------------------------------------------------------------------

function inline(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`);
    return entries.length ? `{ ${entries.join(", ")} }` : "{}";
  }
  return JSON.stringify(value);
}

/**
 * Formato legible y estable: en una línea si cabe; las capas y etiquetas (objetos
 * con `id`) admiten líneas largas; las listas de puntos se agrupan por filas.
 * `prefix` es lo que ya ocupa la línea antes del valor (la clave).
 */
function format(value: Json, indent: number, width: number, prefix = 0): string {
  const pad = " ".repeat(indent);
  const flat = inline(value);
  if (value === null || typeof value !== "object" || indent + prefix + flat.length <= width) return flat;

  if (Array.isArray(value)) {
    const isPointList = value.every((item) => Array.isArray(item) && item.length === 2 && item.every((n) => typeof n === "number"));
    if (isPointList) {
      const lines: string[] = [];
      let line = "";
      for (const item of value.map(inline)) {
        const candidate = line ? `${line}, ${item}` : item;
        if (indent + 2 + candidate.length > width && line) {
          lines.push(line);
          line = item;
        } else line = candidate;
      }
      lines.push(line);
      return `[\n${lines.map((l, i) => `${pad}  ${l}${i < lines.length - 1 ? "," : ""}`).join("\n")}\n${pad}]`;
    }
    const items = value.map((item) => {
      const isEntity = item !== null && typeof item === "object" && !Array.isArray(item) && "id" in item && !("scene" in item);
      return `${pad}  ${format(item, indent + 2, isEntity ? 240 : width)}`;
    });
    return `[\n${items.join(",\n")}\n${pad}]`;
  }
  const entries = Object.entries(value).map(([k, v]) => {
    const key = `${JSON.stringify(k)}: `;
    return `${pad}  ${key}${format(v, indent + 2, width, key.length)}`;
  });
  return `{\n${entries.join(",\n")}\n${pad}}`;
}

const source = readFileSync(DATA_PATH, "utf8");
const data = JSON.parse(source) as { techniques: Record<string, Json>[] };
const technique = data.techniques.find((t) => t.id === "cadeneta");
if (!technique) throw new Error("No existe la técnica `cadeneta`.");

const steps = technique.steps as Record<string, Json>[];
for (const step of steps) {
  const scene = scenes[step.id as string];
  if (!scene) throw new Error(`No hay escena generada para el paso "${step.id}".`);
  step.scene = scene;
}
technique.geometry = GEOMETRY;
technique.pointSets = pointSets as unknown as Json;

// Ubica el objeto de la técnica en el texto y lo sustituye, sin tocar el resto del archivo.
const marker = '      "id": "cadeneta",';
const idIndex = source.indexOf(marker);
const start = source.lastIndexOf("\n    {", idIndex) + 1;
let depth = 0;
let end = start;
for (let i = start; i < source.length; i++) {
  const char = source[i];
  if (char === '"') {
    i++;
    while (source[i] !== '"') i += source[i] === "\\" ? 2 : 1;
    continue;
  }
  if (char === "{") depth++;
  if (char === "}" && --depth === 0) {
    end = i + 1;
    break;
  }
}
const ordered: Record<string, Json> = {};
for (const key of ["id", "name", "abbr", "level", "status", "summary", "difficulty", "estimatedMinutes", "prerequisites", "materials", "tips", "commonMistakes", "stage", "geometry", "pointSets", "steps"]) {
  if (technique[key] !== undefined) ordered[key] = technique[key];
}
const output = source.slice(0, start) + "    " + format(ordered, 4, 110) + source.slice(end);
JSON.parse(output);
writeFileSync(DATA_PATH, output);
console.log(`✓ cadeneta: ${Object.keys(pointSets).length} pointSets de ${POINT_COUNT} puntos y ${steps.length} escenas.`);
