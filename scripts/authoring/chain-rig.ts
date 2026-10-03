/**
 * Una cadeneta (lazada + tirar) a partir del estado con `n` cadenetas hechas.
 *
 * - Lazada: el hilo de trabajo, que sube por detrás de la cadena, pasa por
 *   encima de la cabeza de la aguja de atrás hacia delante y cae en la garganta.
 * - Tirar (ver `pull-rig`): la aguja retrocede con la lazada en la garganta;
 *   el bucle viejo resbala por la punta y se cierra sobre las patas de la
 *   lazada. Después baja como eslabón nuevo (la cadena baja un nivel) y la
 *   lazada se cierra alrededor de la garganta: es el bucle nuevo.
 * - Asentar: la aguja vuelve y el bucle nuevo pasa de la garganta al cuerpo.
 */

import {
  bridgeRise,
  chainBase,
  CX,
  hookLoopLocal,
  hookPoint,
  legThrough,
  LOOP_R,
  LOOP_TILT,
  LOOP_X,
  ovalBody,
  OVAL_B,
  P,
  PITCH,
  REST_POSE,
  restState,
  topOf,
  workingYarnRest,
  Y0,
  type HookPose,
  type RigState,
} from "./cadeneta-rig";
import {
  BALL,
  COLLAPSE_D,
  collapseRates,
  lerpPath,
  linkedLegB,
  newLoopLegs,
  OLD_C,
  oldLoopRadius,
  pullLegA,
  pullLegB,
  pullPhase,
  THROAT_X,
  WRAP_EXIT_LOCAL,
  WRAP_LOCAL,
  withHookAt,
  wrapToLoop,
  wrapWorld,
} from "./pull-rig";
import { add, blendPath, lerp, lerp3, smooth, type Vec3, type Waypoint } from "./yarn-kit";

function tagged(points: Vec3[], tags: Record<number, string> = {}): Waypoint[] {
  return points.map((p, i) => (tags[i] ? { p, tag: tags[i] } : { p }));
}

/** Cuello: el hilo de trabajo sale del puente y sube por detrás de la cadena. */
const neckOf = (top: number) => P(CX - 2, top - 2, -12.5);

/** Del cuello al asiento de la lazada por fuera del bucle de la aguja (por debajo y por detrás). */
function approach(neck: Vec3, seat: Vec3): Vec3[] {
  return [add(lerp3(neck, seat, 0.55), [0, 2.4, 1.5])];
}

/** Hilo de trabajo con la lazada en grado `w` (0 = detrás de la cabeza, 1 = en la garganta). */
export function chainWorking(pose: HookPose, top0: number, w: number): { points: Vec3[]; seat: number; end: number } {
  const H = (x: number, y: number, z: number) => hookPoint(pose, [x, y, z]);
  const neck = neckOf(top0);
  if (w <= 0) return { points: workingYarnRest(pose, top0), seat: -1, end: -1 };
  const wrap = WRAP_LOCAL.map((p) => H(...p));
  const exit = WRAP_EXIT_LOCAL.map((p) => H(...p));
  const states: { w: number; pts: Vec3[] }[] = [
    { w: 0.4, pts: [neck, H(36, 8, -12.5), H(28, 4, -11.5), H(22, -3, -11.2), H(21, -10.5, -6.5), H(19, -12.6, 1.5), H(14, -22, -1.5), H(2, -38, -5)] },
    { w: 0.6, pts: [neck, H(36, 10, -12), H(27, 15, -7), H(22, 16, 1.5), H(20, 8.5, 9), H(19.5, -3, 10.6), H(20.5, -10.5, 4.5), H(19, -20, -2), H(4, -38, -6)] },
    { w: 0.8, pts: [neck, H(36, 10, -11), H(27, 15, -5), H(23, 12.5, 2), H(20, 4.5, 9.4), H(19.5, -3.5, 10), H(21, -10, 3), H(23.5, -8.8, -6.5), H(18, -21, -9), H(4, -38, -7.5)] },
    { w: 1, pts: [neck, ...approach(neck, wrap[0]), ...wrap, ...exit] },
  ];
  let pts = states[states.length - 1].pts;
  for (let i = 0; i < states.length; i++) {
    if (w <= states[i].w) {
      const prev = i === 0 ? null : states[i - 1];
      if (!prev) pts = states[i].pts;
      else pts = blendPath(prev.pts, states[i].pts, (w - prev.w) / (states[i].w - prev.w), states[i].pts.length);
      break;
    }
  }
  return { points: [...pts, ...BALL], seat: 2, end: Math.min(pts.length - 3, 7) };
}

/** Lazada (paso de "yarn over") con `n` cadenetas hechas. */
export function chainYOState(n: number, w: number, pose: HookPose = REST_POSE): RigState {
  const { waypoints, top0 } = chainBase(n);
  const loop = hookLoopLocal(LOOP_X).map((p) => hookPoint(pose, p));
  const working = chainWorking(pose, top0, w);
  const tags: Record<number, string> = {};
  if (working.seat >= 0) {
    tags[working.seat] = "seat";
    tags[working.end] = "wrap-end";
  }
  return {
    waypoints: [
      ...waypoints,
      ...tagged(legThrough(top0, loop[0][1] + 6, -1), { 0: `link-${n}` }),
      ...tagged(loop, { 0: "loop" }),
      ...tagged(legThrough(top0, loop[loop.length - 1][1] + 6, 1)),
      ...tagged(bridgeRise(top0, null)),
      ...tagged(working.points, tags),
    ],
    pose,
  };
}

/** Bucle viejo durante el tirón: anillo quieto en el mundo alrededor de la aguja. */
function oldLoopRing(D: number): Vec3[] {
  const ph = pullPhase(D);
  return hookLoopLocal(0, oldLoopRadius(ph, LOOP_R, 4.4, LOOP_R + 0.6), LOOP_TILT).map((p) => add(p, OLD_C));
}

/**
 * Tirar: la aguja retrocede `D` (0 → PULL_D) con la lazada; el bucle viejo
 * resbala por la punta y se cierra sobre sus patas. `q` (0 → 1) lo baja como
 * eslabón nuevo (la cadena baja un nivel) y cierra la lazada en el bucle nuevo.
 */
export function chainPullState(n: number, D: number, q = 0): RigState {
  const ph = pullPhase(D);
  const rate = collapseRates(q);
  const { waypoints, top0: oldTop } = chainBase(n, PITCH * rate.loop);
  const newTop = topOf(Y0);

  // Bucle viejo: anillo sobre la aguja → óvalo del eslabón nuevo (nivel 0).
  const ring = oldLoopRing(D);
  const oldLegA = legThrough(oldTop, ring[0][1] + 6, -1);
  const oldLegB = legThrough(oldTop, ring[ring.length - 1][1] + 6, 1);
  const oldBridge = bridgeRise(oldTop, null);

  // Lazada y sus patas mientras se tira.
  const neck = neckOf(oldTop);
  const wrap = wrapWorld(ph);
  const legA = [neck, ...pullLegA(ph, approach(neck, wrap[0]), [P(CX - 1, OLD_C[1] + 13, -7)])];
  const legB = pullLegB(ph);

  if (q <= 0) {
    return {
      waypoints: [
        ...waypoints,
        ...tagged([...oldLegA, ...ring, ...oldLegB, ...oldBridge], { 0: `link-${n}`, [oldLegA.length]: "old" }),
        ...tagged(legA),
        ...tagged(wrap, { 0: "seat", [wrap.length - 1]: "wrap-end" }),
        ...tagged([...legB, ...BALL]),
      ],
      pose: ph.pose,
    };
  }

  // Destino (q = 1): eslabón nuevo en el nivel 0 y bucle nuevo en la garganta. Eslabón,
  // bucle y patas cambian a la vez (así las patas no se retuercen); la aguja vuelve más
  // despacio y todo lo que va en ella la sigue.
  const now = withHookAt(ph, lerp(D, COLLAPSE_D, rate.hook));
  const k = rate.loop;
  const legA0 = [neck, ...pullLegA(now, approach(neck, wrapWorld(now)[0]), [P(CX - 1, OLD_C[1] + 13, -7)])];
  const loop = wrapToLoop(now, 1);
  const link = [
    ...legThrough(oldTop, Y0 + OVAL_B - 1, -1),
    ...ovalBody(Y0),
    ...legThrough(oldTop, Y0 + OVAL_B - 1, 1),
    ...bridgeRise(oldTop, newTop),
  ];
  const legs = newLoopLegs(newTop, loop);
  const old = blendPath([...oldLegA, ...ring, ...oldLegB, ...oldBridge], link, k, 25);
  return {
    waypoints: [
      ...waypoints,
      ...tagged(old, { 0: `link-${n}`, 5: "old" }),
      ...tagged(blendPath(legA0, legs.a, k, 7)),
      ...tagged(wrapToLoop(now, k), { 0: "seat", 11: "wrap-end" }),
      ...tagged(lerpPath(pullLegB(now), linkedLegB(newTop, loop), k)),
      ...tagged(BALL),
    ],
    pose: now.pose,
  };
}

/** Asentar: la aguja vuelve (t: 0 → 1) y el bucle nuevo pasa de la garganta al cuerpo. En t = 1 es el reposo con n+1. */
export function chainSettleState(n: number, t: number): RigState {
  if (t >= 1) return restState(n + 1);
  const k = smooth(t);
  const pose: HookPose = { tx: COLLAPSE_D * (1 - k), ty: 0, rot: 0 };
  const { waypoints, top0 } = chainBase(n + 1);
  const loop = hookLoopLocal(lerp(THROAT_X, LOOP_X, k)).map((p) => hookPoint(pose, p));
  const legs = newLoopLegs(top0, loop);
  const working = blendPath([P(CX - 4, top0 - 4, -12.5), P(CX - 16, top0 - 22, -10), ...BALL], workingYarnRest(REST_POSE, top0), k, 7);
  return {
    waypoints: [
      ...waypoints,
      ...tagged(legs.a, { 0: `link-${n + 1}` }),
      ...tagged(loop, { 0: "loop" }),
      ...tagged(legs.b),
      ...tagged(bridgeRise(top0, null)),
      ...tagged(working),
    ],
    pose,
  };
}
