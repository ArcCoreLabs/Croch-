import { buildHookGeometry } from "@/lib/svg/hook-geometry";
import { strandPath } from "@/lib/svg/strand";
import type {
  CompiledCallout,
  CompiledGradient,
  CompiledHook,
  CompiledLayer,
  CompiledScene,
  CompiledStep,
  EaseName,
  Track,
} from "@/lib/player/types";
import type { CalloutInput, CrochetData, HookActorInput, LayerInput, SceneInput, TechniqueInput } from "./schema";
import { resolveStrandFrames, type Point, type PointSets } from "./strands";
import { resolvePathRef } from "./validate";

/**
 * Compilador de escenas: convierte el JSON de autor en pistas uniformes
 * (`Track`) listas para interpolar en el cliente. Se ejecuta en build.
 */

export const DEFAULT_STEP_DURATION_MS = 4200;
/** Easing por defecto para fotogramas sin easing explícito: movimiento natural. */
const DEFAULT_EASE: EaseName = "easeInOut";
const CALLOUT_FADE = 0.05;

/** Evita artefactos de coma flotante (0.5499999…) en los momentos calculados. */
const round4 = (value: number) => Math.round(value * 10000) / 10000;

type Frame<T> = readonly [number, T] | readonly [number, T, EaseName];

export class ContentCompileError extends Error {
  override name = "ContentCompileError";
}

/** Normaliza fotogramas: rellena 0 y 1, garantiza ≥2 claves y un easing por tramo. */
export function framesToTrack<T>(frames: readonly Frame<T>[]): Track<T> {
  if (frames.length === 0) throw new ContentCompileError("Una pista necesita al menos un fotograma.");
  const at: number[] = [];
  const values: T[] = [];
  const ease: EaseName[] = [];

  const first = frames[0];
  if (first[0] > 0) {
    at.push(0);
    values.push(first[1]);
  }
  frames.forEach((frame, index) => {
    if (at.length > 0) ease.push(frame[2] ?? (index === 0 ? "linear" : DEFAULT_EASE));
    at.push(frame[0]);
    values.push(frame[1]);
  });
  if (at[at.length - 1] < 1) {
    at.push(1);
    values.push(values[values.length - 1]);
    ease.push("linear");
  }
  if (at.length === 1) {
    // Un único fotograma en el momento 1.
    at.unshift(0);
    values.unshift(values[0]);
    ease.unshift("linear");
  }
  return { at, values, ease };
}

export function constantTrack<T>(value: T): Track<T> {
  return { at: [0, 1], values: [value, value], ease: ["linear"] };
}

const isFrameList = (value: unknown): value is Frame<unknown>[] =>
  Array.isArray(value) && value.length > 0 && Array.isArray(value[0]);

function numberTrack(input: number | readonly Frame<number>[] | undefined, fallback: number): Track<number> {
  if (input === undefined) return constantTrack(fallback);
  if (typeof input === "number") return constantTrack(input);
  return framesToTrack(input);
}

function pointTracks(
  input: readonly [number, number] | readonly Frame<readonly [number, number]>[] | undefined,
): { x: Track<number>; y: Track<number> } {
  if (input === undefined) return { x: constantTrack(0), y: constantTrack(0) };
  if (!isFrameList(input)) {
    const [x, y] = input as readonly [number, number];
    return { x: constantTrack(x), y: constantTrack(y) };
  }
  const frames = input as readonly Frame<readonly [number, number]>[];
  const toFrames = (axis: 0 | 1): Frame<number>[] =>
    frames.map((f) => (f.length === 3 ? [f[0], f[1][axis], f[2]] : [f[0], f[1][axis]]));
  return { x: framesToTrack(toFrames(0)), y: framesToTrack(toFrames(1)) };
}

function drawTrack(draw: LayerInput["draw"]): Track<number> {
  if (draw === undefined) return constantTrack(1);
  if (typeof draw === "number") return constantTrack(draw);
  if (Array.isArray(draw)) return framesToTrack(draw);
  return framesToTrack<number>([
    [draw.from, 0],
    [draw.to, 1, draw.ease ?? DEFAULT_EASE],
  ]);
}

const isStatic = (track: Track<number>) => track.values.every((v) => v === track.values[0]);

interface SceneContext {
  data: CrochetData;
  geometry: Record<string, string> | undefined;
  pointSets: PointSets;
  viewBox: [number, number, number, number];
  stageHook: HookActorInput | undefined;
  where: string;
}

/** Puntos de cada hilo de la escena como pista (mismos momentos y easings que el autor definió). */
type StrandTracks = Map<string, Track<readonly Point[]>>;

function compileStrands(scene: SceneInput, ctx: SceneContext): StrandTracks {
  const tracks: StrandTracks = new Map();
  Object.entries(scene.strands ?? {}).forEach(([id, strand]) => {
    const frames = resolveStrandFrames(strand, ctx.pointSets).map((frame): Frame<readonly Point[]> => {
      if (frame.points === null) throw new ContentCompileError(`${ctx.where}.strands.${id}: pointSet no encontrado "${frame.ref}".`);
      return frame.ease ? [frame.at, frame.points, frame.ease] : [frame.at, frame.points];
    });
    tracks.set(id, framesToTrack(frames));
  });
  return tracks;
}

function resolvePath(value: string, ctx: SceneContext): string {
  const resolved = resolvePathRef(value, ctx.geometry, ctx.data.svgLibrary.shapes);
  if (resolved === null) throw new ContentCompileError(`${ctx.where}: geometría no encontrada "${value}".`);
  return resolved;
}

function layerPath(layer: LayerInput, ctx: SceneContext, strands: StrandTracks): Track<string> {
  if (layer.strand !== undefined) {
    const strand = strands.get(layer.strand);
    if (!strand || !layer.range) throw new ContentCompileError(`${ctx.where}: hilo inexistente "${layer.strand}".`);
    const [from, to] = layer.range;
    // Cada fotograma del hilo se convierte en el trazado de este tramo.
    return { at: strand.at, values: strand.values.map((points) => strandPath(points, from, to)), ease: strand.ease };
  }
  if (layer.d === undefined) throw new ContentCompileError(`${ctx.where}: la capa no tiene geometría.`);
  if (typeof layer.d === "string") return constantTrack(resolvePath(layer.d, ctx));
  return framesToTrack(
    layer.d.map((f): Frame<string> =>
      f.length === 3 ? [f[0], resolvePath(f[1], ctx), f[2]] : [f[0], resolvePath(f[1], ctx)],
    ),
  );
}

/** Extremos del tramo a lo largo del tiempo: orientan el degradado de tono. */
function layerGradient(layer: LayerInput, strands: StrandTracks): CompiledGradient | null {
  if (layer.activeFrom === undefined || layer.strand === undefined || !layer.range) return null;
  const strand = strands.get(layer.strand);
  if (!strand) return null;
  const [from, to] = layer.range;
  const coordinate = (index: number, axis: 0 | 1): Track<number> => ({
    at: strand.at,
    values: strand.values.map((points) => points[index][axis]),
    ease: strand.ease,
  });
  return {
    from: numberTrack(layer.activeFrom, 0),
    x1: coordinate(from, 0),
    y1: coordinate(from, 1),
    x2: coordinate(to, 0),
    y2: coordinate(to, 1),
  };
}

function compileLayer(layer: LayerInput, ctx: SceneContext, strands: StrandTracks): CompiledLayer {
  const d = layerPath(layer, ctx, strands);
  const draw = drawTrack(layer.draw);
  const trim = numberTrack(layer.trim, 0);
  const translate = pointTracks(layer.translate);

  return {
    id: layer.id,
    role: layer.role,
    depth: layer.depth ?? "front",
    translucent: layer.translucent ?? false,
    attachToHook: layer.attach === "hook",
    marker: layer.marker ?? null,
    label: layer.label ?? null,
    d,
    draw,
    trim,
    opacity: numberTrack(layer.opacity, 1),
    translateX: translate.x,
    translateY: translate.y,
    active: numberTrack(layer.active, 0),
    gradient: layerGradient(layer, strands),
    animatesStroke: !isStatic(draw) || !isStatic(trim) || draw.values[0] !== 1 || trim.values[0] !== 0,
  };
}

function compileHook(sceneHook: SceneInput["hook"], ctx: SceneContext): CompiledHook | null {
  if (sceneHook === false) return null;
  const merged: HookActorInput = { ...ctx.stageHook, ...sceneHook };
  const hooks = ctx.data.tools.hooks;
  const type = hooks.find((h) => h.id === merged.type) ?? hooks[0];
  const [, , width, height] = ctx.viewBox;
  const tip = merged.tip ?? [width * 0.22, height * 0.38];
  const geometry = buildHookGeometry(type.profile, { tip, radius: merged.radius ?? 6 });
  const translate = pointTracks(merged.translate);

  return {
    shape: {
      metal: geometry.metal,
      sleeve: geometry.sleeve,
      sleeveVisible: geometry.sleeveVisible,
      shine: geometry.shine,
      material: type.material,
    },
    pivot: merged.pivot ?? geometry.throatPoint,
    translateX: translate.x,
    translateY: translate.y,
    rotate: numberTrack(merged.rotate, 0),
    opacity: numberTrack(merged.opacity, 1),
  };
}

export function calloutOpacityTrack(show: CalloutInput["show"]): Track<number> {
  const from = show.from;
  const to = show.to ?? 1;
  const frames: Frame<number>[] = [];
  if (from <= 0) frames.push([0, 1]);
  else frames.push([round4(Math.max(0, from - CALLOUT_FADE)), 0], [from, 1, "easeOut"]);
  if (to < 1) {
    const fadeStart = round4(Math.max(to - CALLOUT_FADE, frames[frames.length - 1][0] + 0.001));
    if (fadeStart < to) frames.push([fadeStart, 1]);
    frames.push([to, 0, "easeIn"]);
  }
  return framesToTrack(frames);
}

function compileCallout(callout: CalloutInput): CompiledCallout {
  return {
    id: callout.id,
    text: callout.text,
    at: callout.at,
    placement: callout.placement ?? "top",
    align: callout.align ?? "center",
    tone: callout.tone ?? "info",
    opacity: calloutOpacityTrack(callout.show),
  };
}

export function compileScene(scene: SceneInput, ctx: SceneContext): CompiledScene {
  const strands = compileStrands(scene, ctx);
  const layers = scene.layers.map((layer) =>
    compileLayer(layer, { ...ctx, where: `${ctx.where}.${layer.id}` }, strands),
  );
  return {
    viewBox: ctx.viewBox,
    hook: compileHook(scene.hook, ctx),
    back: layers.filter((l) => l.depth === "back"),
    front: layers.filter((l) => l.depth === "front"),
    callouts: (scene.callouts ?? []).map(compileCallout),
  };
}

export function compileTechniqueSteps(technique: TechniqueInput, data: CrochetData): CompiledStep[] {
  if (technique.steps.length === 0) return [];
  if (!technique.stage) throw new ContentCompileError(`techniques.${technique.id}: falta "stage".`);
  const viewBox = technique.stage.viewBox;

  return technique.steps.map((step) => ({
    id: step.id,
    phase: step.phase,
    title: step.title,
    instruction: step.instruction,
    tip: step.tip ?? null,
    durationMs: step.durationMs ?? DEFAULT_STEP_DURATION_MS,
    scene: compileScene(step.scene, {
      data,
      geometry: technique.geometry,
      pointSets: technique.pointSets,
      viewBox,
      stageHook: technique.stage?.hook,
      where: `techniques.${technique.id}.steps.${step.id}`,
    }),
  }));
}
