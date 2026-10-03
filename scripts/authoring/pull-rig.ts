/**
 * Tirar de la lazada a través de un bucle: común al nudo corredizo (el bucle
 * es el aro de la cola) y a cada cadeneta (el bucle es el que había en la
 * aguja).
 *
 * La aguja retrocede `D` (0 → PULL_D) con la lazada en la garganta. El bucle
 * viejo se queda quieto en el mundo, rodeando la aguja:
 *   1. la lazada se acerca por dentro de él;
 *   2. lo cruza: el bucle se ensancha al pasar la cabeza y las dos patas de la
 *      lazada pasan a ir por su hueco (una por debajo de la aguja y otra por
 *      encima);
 *   3. la punta sale del bucle: ya libre, se cierra sobre las dos patas, que
 *      se juntan.
 * Después (`q`, en cada rig) el bucle baja a su sitio y la lazada se cierra
 * alrededor de la aguja como bucle nuevo, con las patas hacia la cadena.
 */

import { CX, hookLoopLocal, hookPoint, legThrough, LOOP_X, P, TIP, type HookPose } from "./cadeneta-rig";
import { add, blendPath, lerp, lerp3, ramp, resample, smooth, type Vec3 } from "./yarn-kit";

/** Recorrido de la aguja al tirar. */
export const PULL_D = 64;
/** Mientras el bucle viejo se cierra y baja, la aguja ya vuelve hasta aquí (el bucle nuevo queda encima). */
export const COLLAPSE_D = 36;
/** x (en la aguja) de la garganta: ahí queda la lazada y, al cerrarse, el bucle nuevo. */
export const THROAT_X = 22;

/** Lazada en la garganta (coordenadas de la aguja): asiento (abajo) → delante → arriba → arriba-detrás. */
export const WRAP_LOCAL: Vec3[] = [
  [24.5, 13.5, -1.2],
  [22.2, 4.8, 0.6],
  [20.6, 1.4, 7.5],
  [19.8, -4.6, 9.6],
  [21, -10, 2.4],
  [23.8, -8.6, -7],
];

/** Hilo que sale de la lazada hacia la mano (sigue a la aguja). */
export const WRAP_EXIT_LOCAL: Vec3[] = [
  [18, -21.5, -9.2],
  [4, -38, -7.8],
];

/** Hacia el ovillo: fijo en el mundo (el ovillo no se mueve con la aguja). */
export const BALL: Vec3[] = [P(96, -2, -6), P(64, -34, -4.5), P(28, -72, -3)];

/** Centro del bucle viejo: sobre el eje de la aguja en reposo, en la vertical de la cadena. */
export const OLD_C: Vec3 = [CX, TIP[1], 0];

export interface PullPhase {
  D: number;
  pose: HookPose;
  H: (x: number, y: number, z: number) => Vec3;
  /** x del bucle viejo en coordenadas de la aguja (LOOP_X al empezar). */
  xr: number;
  /** 0 → 1: la lazada cruza el bucle viejo (sus patas pasan a ir por el hueco). */
  through: number;
  /** 0 → 1 → 0: el bucle viejo se ensancha al pasar por la cabeza. */
  widen: number;
  /** 0 → 1: el bucle viejo salió por la punta y se cierra sobre las patas. */
  free: number;
}

export function pullPhase(D: number): PullPhase {
  const pose: HookPose = { tx: D, ty: 0, rot: 0 };
  const xr = LOOP_X - D;
  return {
    D,
    pose,
    H: (x, y, z) => hookPoint(pose, [x, y, z]),
    xr,
    through: smooth((THROAT_X + 6 - xr) / 14),
    widen: ramp(xr, 36, 26) - ramp(xr, 2, -8),
    free: ramp(xr, -2, -12),
  };
}

/** Misma fase del tirón (forma del bucle viejo), con la aguja en otra posición. */
export function withHookAt(ph: PullPhase, D: number): PullPhase {
  const pose: HookPose = { tx: D, ty: 0, rot: 0 };
  return { ...ph, D, pose, H: (x, y, z) => hookPoint(pose, [x, y, z]) };
}

/**
 * Avance del cierre (`q` 0 → 1) para el bucle viejo y para la aguja: el bucle
 * baja deprisa al principio y la aguja vuelve después, así nunca se cruzan.
 */
export function collapseRates(q: number): { loop: number; hook: number } {
  return { loop: 1 - (1 - q) * (1 - q), hook: q * q };
}

/**
 * Mezcla de dos recorridos con un avance que cambia a lo largo del hilo (de
 * `k0` en el primer punto a `k1` en el último): sirve para tramos que unen
 * dos cosas que se mueven a ritmos distintos (el bucle viejo y la aguja).
 */
export function rampBlend(a: readonly Vec3[], b: readonly Vec3[], k0: number, k1: number, count = Math.max(a.length, b.length)): Vec3[] {
  if (k0 <= 0 && k1 <= 0) return a.map((p) => [...p] as Vec3);
  if (k0 >= 1 && k1 >= 1) return b.map((p) => [...p] as Vec3);
  const ra = a.length === count ? a : resample(a, count);
  const rb = b.length === count ? b : resample(b, count);
  return ra.map((p, i) => lerp3(p, rb[i], lerp(k0, k1, count === 1 ? 0 : i / (count - 1))));
}

/** Radio del bucle viejo: `base` en el cuerpo, más ancho sobre la cabeza y, ya libre, ceñido a las patas. */
export function oldLoopRadius(ph: PullPhase, base: number, widenBy: number, closed: number): number {
  return base + widenBy * ph.widen + (closed - base) * ph.free;
}

/** Media separación de las patas al cruzar el bucle viejo: rodean la aguja y, ya libres, se juntan. */
export const legGap = (ph: PullPhase) => lerp(6.5, 3.7, ph.free);

/** Lazada en la garganta, en el mundo. */
export function wrapWorld(ph: PullPhase): Vec3[] {
  return WRAP_LOCAL.map((p) => ph.H(...p));
}

/**
 * Pata A: del hilo que viene de abajo (`outside` termina antes del asiento)
 * al asiento de la lazada. Tras cruzar, entra por la parte de abajo del hueco
 * del bucle viejo (`enter` son los puntos fijos antes de ese hueco).
 */
export function pullLegA(ph: PullPhase, outside: Vec3[], enter: Vec3[]): Vec3[] {
  const seat = ph.H(...WRAP_LOCAL[0]);
  const pass = P(OLD_C[0] + 0.6, OLD_C[1] + legGap(ph), 0.8);
  const lead = add(lerp3(pass, seat, 0.55), [0, 1.2 + 2 * ph.free, -0.6]);
  const inside = [...enter, pass, lead];
  return blendPath(outside, inside, ph.through, Math.max(outside.length, inside.length) + 1);
}

/**
 * Pata B: de la lazada (arriba-detrás) hacia el ovillo. Tras cruzar, sale por
 * la parte de arriba del hueco del bucle viejo y sube por detrás. Son 9 puntos
 * en correspondencia con `linkedLegB`, para que el cierre (`q`) se mezcle
 * punto a punto sin pliegues.
 */
export function pullLegB(ph: PullPhase): Vec3[] {
  const direct = WRAP_EXIT_LOCAL.map((p) => ph.H(...p));
  const top = ph.H(...WRAP_LOCAL[WRAP_LOCAL.length - 1]);
  const pass = P(OLD_C[0] + 0.6, OLD_C[1] - legGap(ph), -0.8);
  const behind: Vec3[] = [
    [-2.6, -0.8, -2.2],
    [-5, -2.3, -4.2],
    [-7, -4.8, -5.7],
    [-8.5, -8.3, -6.2],
    [-9.6, -12.3, -6.2],
    [-12.6, -20.3, -6.2],
    [-22.6, -34.3, -5.7],
  ].map((d) => add(pass, d as Vec3));
  const viaLoop = [add(lerp3(top, pass, 0.5), [0, -0.8, -0.8]), pass, ...behind];
  return blendPath(direct, viaLoop, ph.through, viaLoop.length);
}

/**
 * Pata B del bucle nuevo ya cerrado (9 puntos, ver `pullLegB`): del final del
 * bucle baja por delante de la cabeza del eslabón de debajo, entra por su
 * hueco, gira por detrás (puente) y sube hacia el ovillo.
 */
export function linkedLegB(top: number, loopEnd: Vec3): Vec3[] {
  const b = legThrough(top, top, 1);
  return [
    add(lerp3(loopEnd, b[0], 0.5), [0, 0.8, 0]),
    ...b,
    P(CX + 2.4, top + 13.5, -11.5),
    P(CX + 0.6, top + 9, -12.5),
    P(CX - 4, top - 4, -12.5),
    P(CX - 16, top - 22, -10),
  ];
}

/** Mezcla punto a punto de dos recorridos con el mismo número de puntos. */
export function lerpPath(a: readonly Vec3[], b: readonly Vec3[], t: number): Vec3[] {
  if (a.length !== b.length) throw new Error(`lerpPath: ${a.length} ≠ ${b.length} puntos.`);
  return a.map((p, i) => lerp3(p, b[i], t));
}

/**
 * Lazada → bucle nuevo alrededor de la garganta (`k` 0 → 1): la "C" de la
 * lazada se cierra en un anillo con las dos patas abajo.
 */
export function wrapToLoop(ph: PullPhase, k: number): Vec3[] {
  return blendPath(WRAP_LOCAL, hookLoopLocal(THROAT_X), smooth(k), 12).map((p) => ph.H(...p));
}

/**
 * Patas de un bucle de la aguja: atraviesan el eslabón de debajo (cabeza en
 * `top`) y suben hasta los extremos del bucle, en diagonal si el bucle aún
 * no está encima (en la garganta, con la aguja atrás).
 * `a` sube hasta el principio del bucle; `b` baja desde su final.
 */
export function newLoopLegs(top: number, loop: Vec3[]): { a: Vec3[]; b: Vec3[] } {
  const a = legThrough(top, top, -1);
  const b = legThrough(top, top, 1);
  const first = loop[0];
  const last = loop[loop.length - 1];
  const headA = a[a.length - 1];
  const headB = b[0];
  // Tramo intermedio solo si el bucle queda lejos de la cabeza del eslabón.
  if (Math.hypot(first[0] - headA[0], first[1] - headA[1]) > 9) a.push(add(lerp3(headA, first, 0.5), [0, 0.8, 0]));
  if (Math.hypot(last[0] - headB[0], last[1] - headB[1]) > 9) b.unshift(add(lerp3(last, headB, 0.5), [0, 0.8, 0]));
  return { a, b };
}
