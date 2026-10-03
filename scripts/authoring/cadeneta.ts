/**
 * Generador de la lección "Cadeneta" (nudo corredizo + cadenetas) en 3D.
 *
 *   npx tsx scripts/authoring/cadeneta.ts
 *
 * Calcula, para cada paso, los fotogramas clave del hilo (puntos x, y, z con
 * material constante entre ellos), la pose de la aguja, los tramos activos y
 * las etiquetas, y los escribe en `src/data/crochet-data.json` (solo el
 * objeto de la técnica `cadeneta`). Es una herramienta de autoría: la app solo
 * lee el JSON.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { layoutMaterial, limitBend, materialTags, relaxDepth } from "./yarn-kit";
import { HOOK_RADIUS, SPACING, TIP, type HookPose, type RigState } from "./cadeneta-rig";
import { STEPS, VIEWBOX } from "./cadeneta-steps";

const DATA_PATH = new URL("../../src/data/crochet-data.json", import.meta.url);
/** Puntos del hilo: de la punta de la cola hasta salir del escenario hacia el ovillo. */
export const POINT_COUNT = 132;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type EaseName = "linear" | "easeIn" | "easeOut" | "easeInOut" | "backOut" | "anticipate" | "circOut";

export interface KeyDef {
  at: number;
  state: RigState;
  /** Easing del tramo que termina en este fotograma. */
  ease?: EaseName;
}

export interface ToneDef {
  /** Material (unidades desde la punta) que se resalta… */
  from?: number;
  to?: number;
  /** …o el que pasa por puntos de paso etiquetados (en cualquier fotograma del paso). */
  fromTag?: string;
  toTag?: string;
  /** Margen de material antes y después del tramo etiquetado. */
  pad?: [number, number];
  value: number | [number, number, EaseName?][];
  feather?: number;
}

export interface StepDef {
  id: string;
  phase: "hold" | "insert" | "yarn-over" | "pull-through";
  title: string;
  instruction: string;
  tip?: string;
  durationMs: number;
  keys: KeyDef[];
  tone?: ToneDef[];
  callouts?: Json[];
  layers?: Json[];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Diferencia máxima tolerada entre el final de un paso y el principio del siguiente (se iguala). */
const CONTINUITY_TOLERANCE = 3;

function maxJump(a: number[][], b: number[][]): number {
  return a.reduce((max, p, i) => Math.max(max, Math.hypot(p[0] - b[i][0], p[1] - b[i][1], p[2] - b[i][2])), 0);
}

/**
 * Puntos de un estado del esqueleto: material uniforme, curvatura limitada
 * (el hilo no se pellizca) y holgura en profundidad (los cruces no se tocan).
 */
export function statePoints(state: RigState): number[][] {
  const points = limitBend(layoutMaterial(state.waypoints, POINT_COUNT, SPACING));
  return limitBend(relaxDepth(points, { minDistance: 6.8 }), 75, 20).map((p) => p.map(round1));
}

function poseTrack(keys: KeyDef[], read: (pose: HookPose) => Json): Json {
  const values = keys.map((k) => read(k.state.pose));
  if (values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]))) return values[0];
  return keys.map((k, i) => (k.ease && i > 0 ? [k.at, values[i], k.ease] : [k.at, values[i]]));
}

function buildTechnique() {
  const pointSets: Record<string, number[][]> = {};
  const byContent = new Map<string, string>();
  const nameFor = (points: number[][], hint: string) => {
    const key = JSON.stringify(points);
    const existing = byContent.get(key);
    if (existing) return existing;
    pointSets[hint] = points;
    byContent.set(key, hint);
    return hint;
  };

  // Continuidad: cada paso empieza exactamente donde terminó el anterior.
  let previous: { id: string; points: number[][]; pose: HookPose } | null = null;
  const steps = STEPS.map((step) => {
    const frames = step.keys.map((key, i) => {
      let points = statePoints(key.state);
      if (i === 0 && previous) {
        const jump = maxJump(previous.points, points);
        if (jump > CONTINUITY_TOLERANCE || JSON.stringify(previous.pose) !== JSON.stringify(key.state.pose)) {
          throw new Error(`${previous.id} → ${step.id}: el paso no empieza donde acaba el anterior (salto de ${jump.toFixed(1)}).`);
        }
        points = previous.points;
      }
      if (i === step.keys.length - 1) previous = { id: step.id, points, pose: key.state.pose };
      const name = nameFor(points, `${step.id}-${i}`);
      return key.ease && i > 0 ? [key.at, `@${name}`, key.ease] : [key.at, `@${name}`];
    });
    const strand: Record<string, Json> = { points: frames.length === 1 ? (frames[0][1] as string) : (frames as Json) };
    if (step.tone?.length) {
      const tags = step.keys.map((key) => materialTags(key.state.waypoints));
      const fromTags = (name: string) => tags.map((t) => t[name]).filter((v) => v !== undefined);
      strand.tone = step.tone.map((t) => {
        let from = t.from ?? 0;
        let to = t.to ?? 0;
        if (t.fromTag) {
          const values = fromTags(t.fromTag);
          if (!values.length) throw new Error(`${step.id}: no hay puntos con la etiqueta "${t.fromTag}".`);
          from = Math.min(...values) - (t.pad?.[0] ?? 0);
        }
        if (t.toTag) {
          const values = fromTags(t.toTag);
          if (!values.length) throw new Error(`${step.id}: no hay puntos con la etiqueta "${t.toTag}".`);
          to = Math.max(...values) + (t.pad?.[1] ?? 0);
        }
        const span: Record<string, Json> = {
          range: [round1(Math.max(0, from) / SPACING), round1(to / SPACING)],
          value: Array.isArray(t.value) ? t.value.map((f) => (f[2] ? [f[0], f[1], f[2]] : [f[0], f[1]])) : t.value,
        };
        if (t.feather !== undefined) span.feather = t.feather;
        return span;
      });
    }
    strand.spacing = SPACING;
    const hook: Record<string, Json> = {};
    const translate = poseTrack(step.keys, (p) => [round1(p.tx), round1(p.ty)]);
    const rotate = poseTrack(step.keys, (p) => round1(p.rot));
    if (JSON.stringify(translate) !== "[0,0]") hook.translate = translate;
    if (rotate !== 0) hook.rotate = rotate;
    const scene: Record<string, Json> = {};
    if (Object.keys(hook).length) scene.hook = hook;
    scene.strands = { hilo: strand };
    scene.layers = step.layers ?? [];
    if (step.callouts?.length) scene.callouts = step.callouts;
    const out: Record<string, Json> = { id: step.id, phase: step.phase, title: step.title, instruction: step.instruction };
    if (step.tip) out.tip = step.tip;
    out.durationMs = step.durationMs;
    out.scene = scene;
    return out;
  });

  return {
    stage: { viewBox: VIEWBOX, hook: { type: "ergonomica", tip: [TIP[0], TIP[1]], radius: HOOK_RADIUS } },
    pointSets,
    steps,
  };
}

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

const isNumberTuple = (item: Json) => Array.isArray(item) && item.every((n) => typeof n === "number");

/** Legible y estable: en una línea si cabe; las listas de puntos se agrupan en filas compactas. */
function format(value: Json, indent: number, width: number, prefix = 0): string {
  const pad = " ".repeat(indent);
  const flat = inline(value);
  if (value === null || typeof value !== "object" || indent + prefix + flat.length <= width) return flat;
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isNumberTuple)) {
      const lines: string[] = [];
      let line = "";
      for (const item of value.map((v) => JSON.stringify(v))) {
        const candidate = line ? `${line},${item}` : item;
        if (indent + 2 + candidate.length > 200 && line) {
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

function writeTechnique() {
  const source = readFileSync(DATA_PATH, "utf8");
  const data = JSON.parse(source) as { techniques: Record<string, Json>[] };
  const technique = data.techniques.find((t) => t.id === "cadeneta");
  if (!technique) throw new Error("No existe la técnica `cadeneta`.");
  const built = buildTechnique();
  technique.stage = built.stage as unknown as Json;
  technique.pointSets = built.pointSets as unknown as Json;
  technique.steps = built.steps as unknown as Json;
  delete technique.geometry;

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
  console.log(`✓ cadeneta: ${Object.keys(built.pointSets).length} fotogramas de ${POINT_COUNT} puntos y ${built.steps.length} pasos.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) writeTechnique();
