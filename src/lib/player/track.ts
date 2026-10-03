import type { EaseName, Track } from "./types";

/**
 * Lectura de pistas compiladas en un momento dado (0–1), sin DOM ni React.
 * El cliente le pasa las funciones de easing de Framer Motion; los tests,
 * las que quieran.
 */

export type EasingResolver = (name: EaseName) => (t: number) => number;

/** Tramo de la pista que contiene `progress` y avance (ya con easing) dentro de él. */
export function locateTrack<T>(track: Track<T>, progress: number, ease: EasingResolver): [number, number] {
  const { at } = track;
  if (progress <= at[0]) return [0, 0];
  const last = at.length - 1;
  if (progress >= at[last]) return [last - 1, 1];
  let i = 0;
  while (i < last - 1 && progress > at[i + 1]) i++;
  const span = at[i + 1] - at[i];
  const local = span > 0 ? (progress - at[i]) / span : 1;
  return [i, ease(track.ease[i])(local)];
}

export function sampleNumber(track: Track<number>, progress: number, ease: EasingResolver): number {
  const [i, t] = locateTrack(track, progress, ease);
  const a = track.values[i];
  const b = track.values[Math.min(i + 1, track.values.length - 1)];
  return a + (b - a) * t;
}

/** Interpola listas de números de igual longitud (p. ej. los puntos x, y, z de un hilo). */
export function sampleNumbers(track: Track<number[]>, progress: number, ease: EasingResolver, out?: Float64Array): Float64Array {
  const [i, t] = locateTrack(track, progress, ease);
  const a = track.values[i];
  const b = track.values[Math.min(i + 1, track.values.length - 1)];
  const result = out && out.length === a.length ? out : new Float64Array(a.length);
  for (let k = 0; k < a.length; k++) result[k] = a[k] + (b[k] - a[k]) * t;
  return result;
}
