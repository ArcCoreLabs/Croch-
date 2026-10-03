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
import type { HookMaterial, HookProfile } from "@/lib/svg/hook-geometry";

export type { EaseName, LayerRole, Phase };

export interface Track<T> {
  /** Momentos (0–1) estrictamente crecientes; siempre al menos dos. */
  at: number[];
  values: T[];
  /** Un easing por tramo (`at.length - 1`). */
  ease: EaseName[];
}

/** Tramo activo (amarillo) de un hilo, en índices de punto: viaja con el material. */
export interface CompiledToneSpan {
  from: number;
  to: number;
  /** Fundido de los bordes, en puntos. */
  feather: number;
  value: Track<number>;
  /** "sweep": el brillo recorre el tramo en el sentido del hilo; "fade": se funde entero. */
  mode: ToneMode;
}

export type ToneMode = "sweep" | "fade";

/** Hilo continuo en 3D: puntos x, y, z aplanados por fotograma. */
export interface CompiledStrand {
  id: string;
  points: Track<number[]>;
  tone: CompiledToneSpan[];
  /** Material entre puntos consecutivos (ancla la torsión de las hebras). */
  spacing: number;
  /** El primer punto es una punta libre. */
  freeStart: boolean;
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
  /** Punta en reposo, radio y perfil: con ellos el cliente arma el volumen 3D de la aguja. */
  tip: [number, number];
  radius: number;
  profile: HookProfile;
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
  strands: CompiledStrand[];
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
