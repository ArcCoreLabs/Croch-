/**
 * "Esqueleto" articulado de la lección de cadeneta (nudo corredizo + cadenas).
 *
 * Coordenadas del viewBox: x → derecha, y → abajo, z → hacia quien mira.
 * La aguja está horizontal (punta a la izquierda) en el plano z = 0.
 *
 * Topología de la cadena en reposo (de la cola al ovillo):
 *   cola → óvalo del nudo (la cola cruza por delante en X) → por detrás →
 *   pata A del eslabón de abajo → su óvalo → pata B (baja por delante de la
 *   cabeza del óvalo de debajo y entra por su hueco) → puente (gira por
 *   detrás) → sube por detrás → pata A del eslabón siguiente → … → bucle en
 *   la aguja → pata B → puente → hilo de trabajo (sube por detrás) → ovillo.
 * Cada óvalo abraza las dos patas del eslabón de encima: por delante se ve la
 * "V" de la cadeneta y por detrás queda el puente.
 */

import { arc, deg, type Vec3, type Waypoint } from "./yarn-kit";

export const W = 7;
export const SPACING = 5;
/** Punta de la aguja en reposo y su radio. */
export const TIP: [number, number] = [99, 66];
export const HOOK_RADIUS = 6;
/** Pivote de giro de la aguja (garganta, como en el compilador). */
export const PIVOT: [number, number] = [TIP[0] + 19.96, TIP[1] + 1.98];
/** x (local a la aguja) del bucle de trabajo sobre el cuerpo. */
export const LOOP_X = 51;
/** Eje vertical de la cadena. */
export const CX = TIP[0] + LOOP_X;
/** Altura del primer collar bajo la aguja y separación entre collares. */
export const Y0 = 96;
export const PITCH = 24;

export interface HookPose {
  tx: number;
  ty: number;
  rot: number;
}

export const REST_POSE: HookPose = { tx: 0, ty: 0, rot: 0 };

/** Punto en coordenadas de la aguja (origen en la punta en reposo) → mundo. */
export function hookPoint(pose: HookPose, local: Vec3): Vec3 {
  const x = TIP[0] + local[0];
  const y = TIP[1] + local[1];
  const a = deg(pose.rot);
  const dx = x - PIVOT[0];
  const dy = y - PIVOT[1];
  return [
    PIVOT[0] + dx * Math.cos(a) - dy * Math.sin(a) + pose.tx,
    PIVOT[1] + dx * Math.sin(a) + dy * Math.cos(a) + pose.ty,
    local[2],
  ];
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------
//
// Cada eslabón es un óvalo casi de frente (la "V" de la cadeneta): sus dos
// brazos van por delante y su cabeza queda un poco atrás. Las dos patas del
// eslabón de ENCIMA pasan por delante de esa cabeza y se meten por el hueco
// del óvalo hacia atrás. Por detrás, la pata derecha da la vuelta ("puente")
// y sube hasta el hueco del eslabón siguiente, por donde sale hacia delante
// como pata izquierda del siguiente.

/** Semiancho y semialto del óvalo de un eslabón. */
export const OVAL_A = 9.6;
export const OVAL_B = 11;
/** Separación de las dos patas que atraviesan un óvalo. */
export const LEG_X = 3.2;
/** Profundidad de la cabeza del óvalo (algo detrás) y de los brazos (delante). */
export const HEAD_Z = -1.5;

/** Bucle alrededor del cuerpo de la aguja (coordenadas locales de la aguja). */
export const LOOP_R = 10;
export const LOOP_TILT = 48;
export function hookLoopLocal(x: number, radius = LOOP_R, tilt = LOOP_TILT, from = -62, to = 248, n = 12): Vec3[] {
  const b = deg(tilt);
  const e1: Vec3 = [-Math.sin(b), 0, Math.cos(b)]; // 0° = delante
  const e2: Vec3 = [0, -1, 0]; // 90° = arriba
  return arc([x, 0, 0], e1, e2, radius, from, to, n);
}

export const P = (x: number, y: number, z: number): Vec3 => [x, y, z];

export function levelY(level: number, shift = 0) {
  return Y0 + PITCH * level + shift;
}
export const topOf = (y: number) => y - OVAL_B;

/**
 * Patas que atraviesan el óvalo cuya cabeza está en `top`: suben desde detrás,
 * salen por el hueco, pasan por delante de la cabeza y llegan a `endY`.
 * `side` = -1 izquierda (sube), +1 derecha (baja: se devuelve invertida).
 */
export function legThrough(top: number, endY: number, side: -1 | 1): Vec3[] {
  const x = CX + side * LEG_X;
  const up = [P(x + side * -0.2, top + 9.5, -8.5), P(x, top + 6.5, -3.5), P(x + side * 0.2, top + 1.5, 3.6), P(x + side * 0.4, top - 2.5, 5.2)];
  if (endY < top - 6) up.push(P(x + side * 0.6, (top - 2.5 + endY) / 2, 4.6));
  return side === -1 ? up : up.reverse();
}

/** Óvalo de un eslabón centrado en `y`: brazo izquierdo (sube) → cabeza → brazo derecho (baja). */
export function ovalBody(y: number): Vec3[] {
  return [
    P(CX - OVAL_A + 1.6, y + 6, 3),
    P(CX - OVAL_A, y - 0.5, 2),
    P(CX - OVAL_A + 2.4, y - 7.4, 0.4),
    P(CX - 2.8, y - OVAL_B + 0.4, HEAD_Z),
    P(CX + 2.8, y - OVAL_B + 0.4, HEAD_Z),
    P(CX + OVAL_A - 2.4, y - 7.4, 0.4),
    P(CX + OVAL_A, y - 0.5, 2),
    P(CX + OVAL_A - 1.6, y + 6, 3),
  ];
}

/** Puente: tras entrar por el hueco hacia atrás, el hilo gira y sube por detrás hasta `toTop` (hueco de encima). */
export function bridgeRise(fromTop: number, toTop: number | null): Vec3[] {
  const turn = [P(CX + 2.4, fromTop + 13.5, -11.5), P(CX + 0.6, fromTop + 9, -12.5)];
  if (toTop === null) return turn;
  return [...turn, P(CX - 1.4, (fromTop + toTop) / 2 + 3, -11.5)];
}

/** Óvalo del nudo corredizo (L1): la cola cruza por delante en la base (X). */
export function knotOval(y: number): { tail: Vec3[]; ring: Vec3[]; under: Vec3[] } {
  const top = topOf(y);
  return {
    tail: [P(CX + 4.5, y + 46, 1), P(CX + 3.6, y + 33, 2), P(CX + 2, y + 21, 3.5)],
    ring: [
      P(CX - 0.6, y + 13.2, 4.6),
      P(CX - 5.6, y + 9.6, 3.2),
      P(CX - OVAL_A, y + 1.5, 2),
      P(CX - OVAL_A + 2.2, y - 6.8, 0.4),
      P(CX - 2.8, top + 0.4, HEAD_Z),
      P(CX + 2.8, top + 0.4, HEAD_Z),
      P(CX + OVAL_A - 2.2, y - 6.8, 0.4),
      P(CX + OVAL_A, y + 1.5, 1.6),
      P(CX + 5.4, y + 9.8, -0.6),
    ],
    under: [P(CX + 0.4, y + 13.4, -3.6), P(CX - 3.8, y + 15.4, -8.5), P(CX - 3.6, y + 8, -12)],
  };
}

// ---------------------------------------------------------------------------
// Estado de reposo con `n` cadenetas hechas
// ---------------------------------------------------------------------------

export const M_TAIL = 52;

export interface RigState {
  waypoints: Waypoint[];
  pose: HookPose;
}

/** Hilo de trabajo: sube por detrás de la cadena y de la aguja, y sale arriba a la izquierda. */
export function workingYarnRest(pose: HookPose, fromTop: number): Vec3[] {
  return [
    P(CX - 2, fromTop - 2, -12.5),
    hookPoint(pose, [LOOP_X - 14, 6, -12.5]),
    hookPoint(pose, [LOOP_X - 21, -2, -11.5]),
    hookPoint(pose, [LOOP_X - 27, -16, -9]),
    hookPoint(pose, [12, -34, -7]),
    hookPoint(pose, [-14, -56, -5]),
    hookPoint(pose, [-40, -80, -4]),
    hookPoint(pose, [-70, -110, -3]),
  ];
}

type Push = (points: Vec3[], m?: number, tag?: string) => void;

function collector(): { w: Waypoint[]; push: Push } {
  const w: Waypoint[] = [];
  const push: Push = (points, m, tag) =>
    points.forEach((p, i) => w.push({ p, ...(i === 0 && m !== undefined ? { m } : {}), ...(i === 0 && tag ? { tag } : {}) }));
  return { w, push };
}

/**
 * Cola + nudo + eslabones hechos (niveles n … 0), desplazados `shift` hacia
 * abajo. Termina detrás del eslabón de arriba, subiendo hacia su hueco: ahí
 * empieza la pata A del bucle de la aguja. Devuelve la cabeza de ese eslabón.
 */
export function chainBase(n: number, shift = 0): { waypoints: Waypoint[]; top0: number } {
  const { w, push } = collector();
  const knotY = levelY(n, shift);
  const knot = knotOval(knotY);
  push([knot.tail[0]], 0);
  push(knot.tail.slice(1));
  push(knot.ring, M_TAIL, "knot");
  push(knot.under);
  let belowTop = topOf(knotY);
  for (let level = n - 1; level >= 0; level--) {
    const y = levelY(level, shift);
    push(legThrough(belowTop, y + OVAL_B - 1, -1), undefined, `link-${n - 1 - level}`);
    push(ovalBody(y));
    push(legThrough(belowTop, y + OVAL_B - 1, 1));
    push(bridgeRise(belowTop, topOf(y)));
    belowTop = topOf(y);
  }
  return { waypoints: w, top0: belowTop };
}

export function restState(n: number, pose: HookPose = REST_POSE): RigState {
  const { waypoints, top0 } = chainBase(n);
  const { w, push } = collector();
  // Bucle en la aguja: sus patas atraviesan el eslabón de arriba (o el nudo).
  const loop = hookLoopLocal(LOOP_X).map((p) => hookPoint(pose, p));
  push(legThrough(top0, loop[0][1] + 6, -1), undefined, `link-${n}`);
  push(loop, undefined, "loop");
  push(legThrough(top0, loop[loop.length - 1][1] + 6, 1));
  push(bridgeRise(top0, null), undefined, "loop-end");
  push(workingYarnRest(pose, top0));
  return { waypoints: [...waypoints, ...w], pose };
}

