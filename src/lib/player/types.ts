/**
 * Formato "compilado" que consume el reproductor en el cliente.
 *
 * El JSON que escriben los autores es cómodo (atajos, referencias `@nombre`,
 * valores fijos o animados). El compilador (en build) lo transforma en este
 * formato uniforme: cada propiedad animable es una pista con momentos
 * crecientes, valores y easings. Así el cliente no necesita validar nada ni
 * cargar Zod: solo interpola.
 */

import type { EaseName, LayerRole, Phase } from "@/lib/content/schema";
import type { HookMaterial } from "@/lib/svg/hook-geometry";

export type { EaseName, LayerRole, Phase };

export interface Track<T> {
  /** Momentos (0–1) estrictamente crecientes; siempre al menos dos. */
  at: number[];
  values: T[];
  /** Un easing por tramo (`at.length - 1`). */
  ease: EaseName[];
}

/** Degradado de tono a lo largo de un tramo (del primer al último punto). */
export interface CompiledGradient {
  /** Tono en el inicio del tramo (el final usa `active`). */
  from: Track<number>;
  x1: Track<number>;
  y1: Track<number>;
  x2: Track<number>;
  y2: Track<number>;
}

export interface CompiledLayer {
  id: string;
  role: LayerRole;
  depth: "back" | "front";
  translucent: boolean;
  attachToHook: boolean;
  marker: "arrow" | "dot" | null;
  label: string | null;
  d: Track<string>;
  /** Fin del tramo visible (0–1). */
  draw: Track<number>;
  /** Inicio del tramo visible (0–1). */
  trim: Track<number>;
  opacity: Track<number>;
  translateX: Track<number>;
  translateY: Track<number>;
  active: Track<number>;
  gradient: CompiledGradient | null;
  /** `true` si `draw`/`trim` cambian: activa la animación de trazo. */
  animatesStroke: boolean;
}

export interface CompiledHookShape {
  metal: string;
  sleeve: string;
  sleeveVisible: boolean;
  shine: string;
  material: HookMaterial;
}

export interface CompiledHook {
  shape: CompiledHookShape;
  pivot: [number, number];
  translateX: Track<number>;
  translateY: Track<number>;
  rotate: Track<number>;
  opacity: Track<number>;
}

export interface CompiledCallout {
  id: string;
  text: string;
  at: [number, number];
  placement: "top" | "bottom" | "left" | "right";
  align: "start" | "center" | "end";
  tone: "info" | "success" | "warning";
  opacity: Track<number>;
}

export interface CompiledScene {
  viewBox: [number, number, number, number];
  hook: CompiledHook | null;
  back: CompiledLayer[];
  front: CompiledLayer[];
  callouts: CompiledCallout[];
}

export interface CompiledStep {
  id: string;
  phase: Phase;
  title: string;
  instruction: string;
  tip: string | null;
  durationMs: number;
  scene: CompiledScene;
}
