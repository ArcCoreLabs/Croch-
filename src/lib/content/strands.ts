import type { EaseName, StrandInput } from "./schema";

export type Point = readonly [number, number];
export type PointSets = Record<string, readonly Point[]> | undefined;

export interface StrandFrame {
  at: number;
  ease: EaseName | undefined;
  /** `null` si la referencia `"@nombre"` no existe. */
  points: readonly Point[] | null;
  ref: string;
}

type PointsValue = string | readonly Point[];
type PointsFrame = readonly [number, PointsValue] | readonly [number, PointsValue, EaseName];

/** Una pista es una lista de fotogramas `[momento, puntos | "@ref", easing?]`; una lista de puntos tiene números. */
function isFrameList(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]) && typeof value[0][1] !== "number";
}

function resolveValue(value: PointsValue, pointSets: PointSets): Pick<StrandFrame, "points" | "ref"> {
  if (typeof value === "string") return { points: pointSets?.[value.slice(1)] ?? null, ref: value };
  return { points: value, ref: "(puntos en línea)" };
}

/** Resuelve los fotogramas de un hilo (`"@pointSet"` o puntos en línea) a listas de puntos. */
export function resolveStrandFrames(strand: StrandInput, pointSets: PointSets): StrandFrame[] {
  const raw: unknown = strand.points;
  if (!isFrameList(raw)) return [{ at: 0, ease: undefined, ...resolveValue(raw as PointsValue, pointSets) }];
  return (raw as PointsFrame[]).map((frame) => ({ at: frame[0], ease: frame[2], ...resolveValue(frame[1], pointSets) }));
}
