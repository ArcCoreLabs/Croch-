import { locateTrack, type EasingResolver } from "@/lib/player/track";
import type { CompiledToneSpan } from "@/lib/player/types";

/**
 * Tramo activo de un hilo en un instante: índices de punto y valor 0–1.
 * `head` / `tail` son frentes que recorren el tramo (modo "sweep"): solo
 * está encendido lo que queda detrás de `head` y delante de `tail`.
 */
export interface ToneSpanState {
  from: number;
  to: number;
  feather: number;
  value: number;
  head?: number;
  tail?: number;
}

const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * Estado de un tramo en `progress`. En modo "sweep" el valor es la parte
 * recorrida: al encenderse avanza un frente desde `from` hasta `to` y, al
 * apagarse, otro frente lo borra en el mismo sentido. Así el color viaja con
 * el flujo del hilo (de la cola al ovillo) y nunca aparece a medio tono.
 */
export function toneSpanAt(span: CompiledToneSpan, progress: number, ease: EasingResolver): ToneSpanState {
  const { values } = span.value;
  const [i, t] = locateTrack(span.value, progress, ease);
  const a = values[i];
  const b = values[Math.min(i + 1, values.length - 1)];
  const value = a + (b - a) * t;
  const state: ToneSpanState = { from: span.from, to: span.to, feather: span.feather, value };
  if (span.mode === "fade" || a === b) return state;
  // Recorrido total: el frente sale de antes del borde fundido y acaba pasado el otro.
  const f = Math.max(span.feather, 1e-3);
  const travel = span.to - span.from + 3 * f;
  if (b > a) return { ...state, value: 1, head: span.from - f + travel * value };
  return { ...state, value: 1, tail: span.to + f - travel * value };
}

/** Tono (0 base · 1 activo) en la posición `u` del hilo, con bordes fundidos. */
export function toneAt(spans: readonly ToneSpanState[], u: number): number {
  let tone = 0;
  for (const span of spans) {
    if (span.value <= 0) continue;
    let weight: number;
    if (u >= span.from && u <= span.to) weight = 1;
    else if (span.feather <= 0) weight = 0;
    else if (u < span.from) weight = smoothstep(1 - (span.from - u) / span.feather);
    else weight = smoothstep(1 - (u - span.to) / span.feather);
    if (weight > 0 && span.head !== undefined) weight *= smoothstep((span.head - u) / Math.max(span.feather, 1e-3));
    if (weight > 0 && span.tail !== undefined) weight *= smoothstep((u - span.tail) / Math.max(span.feather, 1e-3));
    tone = Math.max(tone, span.value * weight);
  }
  return tone;
}
