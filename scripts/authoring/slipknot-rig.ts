/**
 * Nudo corredizo desde la punta visible (pasos 1–6 de la lección).
 *
 * 1. La cola cuelga (punta libre a la vista).
 * 2. La cola se enrolla y forma un aro: al cerrarlo, la cola cruza POR
 *    ENCIMA del hilo que va al ovillo (punto X).
 * 3. El aro gira para quedar de canto y la aguja entra por él.
 * 4. Lazada: el hilo del ovillo pasa por encima de la aguja y cae en la garganta.
 * 5. La aguja retrocede y saca la lazada a través del aro; el aro resbala por la punta.
 * 6. Se tira de la cola y del ovillo: el aro se cierra en el nudo y el bucle se ajusta.
 */

import {
  bridgeRise,
  CX,
  hookLoopLocal,
  hookPoint,
  knotOval,
  LOOP_X,
  M_TAIL,
  REST_POSE,
  restState,
  TIP,
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
  oldLoopRadius,
  pullLegA,
  pullLegB,
  pullPhase,
  rampBlend,
  THROAT_X,
  withHookAt,
  wrapToLoop,
  wrapWorld,
} from "./pull-rig";
import { add, blendPath, deg, dist3, lerp, lerp3, normalize, smooth, smoothPath, sub, type Vec3, type Waypoint } from "./yarn-kit";

export const RING_C: Vec3 = [CX, TIP[1], 0];
export const RING_R = 12;
/** Inclinación del aro cuando la aguja lo atraviesa (gira sobre su eje vertical). */
export const RING_TILT = 62;
/** Pose de espera de la aguja (arriba a la derecha) mientras se forma el aro. */
export const WAIT_POSE: HookPose = { tx: 80, ty: -28, rot: 0 };

const P = (x: number, y: number, z: number): Vec3 => [x, y, z];

/** Gira un punto alrededor del eje vertical que pasa por `c` (el lado izquierdo viene hacia delante). */
function tiltAbout(c: Vec3, p: Vec3, tiltDeg: number): Vec3 {
  const b = deg(tiltDeg);
  const dx = p[0] - c[0];
  const dz = p[2] - c[2];
  return [c[0] + dx * Math.cos(b) + dz * Math.sin(b), p[1], c[2] - dx * Math.sin(b) + dz * Math.cos(b)];
}

/**
 * Aro en forma de lágrima con el cruce X abajo. Orden del hilo: X por encima →
 * lado izquierdo (sube) → arriba → lado derecho (baja) → X por debajo.
 */
export function teardrop(c: Vec3, r: number, tiltDeg = 0): Vec3[] {
  const pts: Vec3[] = [
    P(-1.2, r + 2.6, 3.6),
    P(-6.8, r - 2.2, 2.2),
    P(-r, 0, 0.8),
    P(-0.72 * r, -0.72 * r, 0),
    P(0, -r, 0),
    P(0.72 * r, -0.72 * r, 0),
    P(r, 0, -0.8),
    P(6.8, r - 2.2, -2.2),
    P(1.2, r + 2.6, -3.6),
  ];
  return pts.map((p) => tiltAbout(c, add(c, p), tiltDeg));
}

/**
 * Hilo que cuelga: sale de `start` en la dirección `dir` y se va doblando hacia
 * abajo. `turn` elige el sentido del giro cuando la dirección es casi opuesta.
 */
export function dangle(start: Vec3, dir: Vec3, length: number, opts: { z?: number; bend?: number; turn?: -1 | 1; step?: number } = {}): Vec3[] {
  const step = opts.step ?? 4;
  const bend = opts.bend ?? 0.05;
  const targetZ = opts.z ?? start[2];
  let angle = Math.atan2(dir[1], dir[0]);
  let p = start;
  const out: Vec3[] = [];
  let travelled = 0;
  while (travelled < length - 1e-6) {
    const ds = Math.min(step, length - travelled);
    let delta = Math.PI / 2 - angle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    if (opts.turn && Math.abs(delta) > Math.PI * 0.75 && Math.sign(delta) !== opts.turn) delta += opts.turn * 2 * Math.PI;
    const max = bend * ds;
    angle += Math.max(-max, Math.min(max, delta));
    p = [p[0] + Math.cos(angle) * ds, p[1] + Math.sin(angle) * ds, lerp(p[2], targetZ, 0.2)];
    out.push(p);
    travelled += ds;
  }
  return out;
}

/** Recorrido denso del aro y su longitud (para enrollar una fracción). */
function denseRing(points: Vec3[]): { dense: Vec3[]; arc: number[] } {
  const { dense } = smoothPath(points, 10);
  const arc = [0];
  for (let i = 1; i < dense.length; i++) arc.push(arc[i - 1] + Math.hypot(...sub(dense[i], dense[i - 1])));
  return { dense, arc };
}

export const RING_LENGTH = (() => {
  const { arc } = denseRing(teardrop(RING_C, RING_R));
  return arc[arc.length - 1];
})();
/** Material desde la punta hasta X (por debajo) con el aro formado. */
export const M_X = M_TAIL + RING_LENGTH;
/** Cola libre antes de enrollar (luego el aro toma hilo del lado del ovillo). */
const FREE_TAIL = 88;

/**
 * Pata A por fuera del aro: de X (por debajo) al asiento de la lazada, en una
 * "U" que cuelga. Se acorta sola cuando la lazada se acerca a X.
 */
function uUnder(xUnder: Vec3, seat: Vec3): Vec3[] {
  const sag = 0.26 * dist3(xUnder, seat);
  return [add(lerp3(xUnder, seat, 0.3), [0, sag, -0.6]), add(lerp3(xUnder, seat, 0.72), [0, sag * 0.8, -1])];
}

/**
 * Hilo de trabajo desde X (por debajo del aro) hasta el ovillo. `w` = avance de
 * la lazada: 0 pasa por detrás de la cabeza de la aguja; 1 rodea la cabeza y
 * descansa en la garganta. Las posiciones con aguja siguen su pose.
 */
export function workingFromX(xUnder: Vec3, pose: HookPose, w: number): Vec3[] {
  const H = (x: number, y: number, z: number) => hookPoint(pose, [x, y, z]);
  if (w <= 0) {
    // En reposo pasa por detrás de la cabeza (posición del mundo con la aguja en reposo).
    const R = (x: number, y: number, z: number) => hookPoint(REST_POSE, [x, y, z]);
    const behind = [R(18, 12, -6.5), R(15, 0, -10.6), R(10, -14, -9.5), R(-6, -34, -8), R(-30, -62, -6), R(-62, -96, -4)];
    return [...uUnder(xUnder, behind[0]), ...behind];
  }
  const states: { w: number; pts: Vec3[] }[] = [
    { w: 0.4, pts: [H(23, 13, -6.5), H(22, 1, -11.2), H(21, -10.5, -6.5), H(19, -12.6, 1.5), H(14, -22, -1.5), H(2, -38, -5)] },
    { w: 0.6, pts: [H(23, 15, -6), H(21.5, 15.5, 2.5), H(20, 8.5, 9), H(19.5, -3, 10.6), H(20.5, -10.5, 4.5), H(19, -20, -2), H(4, -38, -6)] },
    { w: 0.8, pts: [H(24, 14, -3.5), H(22, 11.5, 2.5), H(20, 4.5, 9.4), H(19.5, -3.5, 10), H(21, -10, 3), H(23.5, -8.8, -6.5), H(18, -21, -9), H(4, -38, -7.5)] },
    { w: 1, pts: [H(24.5, 13.5, -1.2), H(22.2, 4.8, 0.6), H(20.6, 1.4, 7.5), H(19.8, -4.6, 9.6), H(21, -10, 2.4), H(23.8, -8.6, -7), H(18, -21.5, -9.2), H(4, -38, -7.8)] },
  ];
  // Entre estados con el mismo número de puntos, interpolación directa; si no, el más cercano.
  let pts = states[states.length - 1].pts;
  for (let i = 0; i < states.length; i++) {
    if (w <= states[i].w) {
      const prev = i === 0 ? null : states[i - 1];
      if (!prev || prev.pts.length !== states[i].pts.length) pts = states[i].pts;
      else {
        const t = (w - prev.w) / (states[i].w - prev.w);
        pts = states[i].pts.map((p, k) => lerp3(prev.pts[k], p, t));
      }
      break;
    }
  }
  return [...uUnder(xUnder, pts[0]), ...pts, ...BALL];
}

/** Paso 1–2: la cola cuelga (c = 0) y se enrolla hasta formar el aro (c = 1). */
export function curlState(c: number, pose: HookPose = WAIT_POSE): RigState {
  const ring = teardrop(RING_C, RING_R);
  const { dense, arc } = denseRing(ring);
  const total = arc[arc.length - 1];
  const wrapLength = total * c;
  const from = total - wrapLength;
  const wrapped = dense.filter((_, i) => arc[i] >= from - 1e-6);
  const xUnder = ring[ring.length - 1];
  const mX = lerp(FREE_TAIL, M_X, c);
  const tailLength = mX - wrapLength;
  // Sin aro, la cola sigue la dirección del hilo que llega a X (en "S" suave) y cae.
  const arriving = normalize(sub(xUnder, workingFromX(xUnder, pose, 0)[0]));
  let start = xUnder;
  let dir: Vec3 = arriving;
  if (wrapped.length >= 2) {
    start = wrapped[0];
    const back = normalize(sub(wrapped[0], wrapped[1]));
    const k = Math.min(1, c * 5);
    dir = normalize(lerp3(arriving, back, k));
  }
  // Mientras no hay aro, la cola cae girando hacia la derecha; al enrollar, sigue el giro del aro.
  const hanging = dangle(start, dir, tailLength, c > 0.05 ? { z: 4, bend: 0.045, turn: -1 } : { z: start[2], bend: 0.05 });
  const tail = [...hanging].reverse();
  const w: Waypoint[] = [{ p: tail[0], m: 0 }, ...tail.slice(1).map((p) => ({ p }))];
  const ringPart = wrapped.length >= 2 ? wrapped.filter((_, i) => i % 3 === 0 || i === wrapped.length - 1) : [xUnder];
  ringPart.forEach((p, i) => w.push(i === ringPart.length - 1 ? { p, m: mX, tag: "x-under" } : { p }));
  workingFromX(xUnder, pose, 0).forEach((p) => w.push({ p }));
  return { waypoints: w, pose };
}

/** Cola que cuelga del cruce X (por encima) del aro, de la punta hasta X. */
function hangingTail(ring: Vec3[]): Vec3[] {
  return dangle(ring[0], normalize(sub(ring[0], ring[1])), M_TAIL, { z: 4, bend: 0.045 }).reverse();
}

/** Paso 3: el aro gira de canto (`tilt` 0–1) y la aguja llega a `pose`. */
export function ringOnHookState(tilt: number, pose: HookPose, yo = 0): RigState {
  const ring = teardrop(RING_C, RING_R, RING_TILT * tilt);
  const xUnder = ring[ring.length - 1];
  const tail = hangingTail(ring);
  const w: Waypoint[] = [{ p: tail[0], m: 0 }, ...tail.slice(1).map((p) => ({ p }))];
  ring.forEach((p, i) => w.push(i === 0 ? { p, m: M_TAIL } : i === ring.length - 1 ? { p, tag: "x-under" } : { p }));
  workingFromX(xUnder, pose, yo).forEach((p, i) => w.push(i === 3 && yo >= 1 ? { p, tag: "seat" } : i === 7 && yo >= 1 ? { p, tag: "wrap-end" } : { p }));
  return { waypoints: w, pose };
}

// ---------------------------------------------------------------------------
// Pasos 5–6: sacar la lazada por el aro y ajustar el nudo
// ---------------------------------------------------------------------------


/**
 * Paso 5: la aguja retrocede `D` (0 → PULL_D) llevando la lazada; el aro
 * queda quieto en el mundo, se ensancha al pasar por la cabeza, resbala por la
 * punta y se cierra sobre las patas de la lazada. `q` (0 → 1) lo baja después
 * como nudo y cierra la lazada alrededor de la garganta.
 */
export function slipPullState(D: number, q = 0): RigState {
  const ph = pullPhase(D);
  const ring = teardrop(RING_C, oldLoopRadius(ph, RING_R, 3.8, RING_R - 1), RING_TILT);
  const xUnder = ring[ring.length - 1];
  const tail = hangingTail(ring);
  const wrap = wrapWorld(ph);
  const legA = pullLegA(ph, uUnder(xUnder, wrap[0]), []);
  const legB = pullLegB(ph);

  let parts: { tail: Vec3[]; ring: Vec3[]; legA: Vec3[]; head: Vec3[]; legB: Vec3[] };
  let pose = ph.pose;
  if (q <= 0) parts = { tail, ring, legA, head: wrap, legB };
  else {
    // Destino (q = 1): el aro es el nudo (de frente, bajo la aguja) y la lazada, el bucle
    // nuevo en la garganta. El aro baja primero; la aguja vuelve después.
    const rate = collapseRates(q);
    const end = withHookAt(ph, COLLAPSE_D);
    const now = withHookAt(ph, lerp(D, COLLAPSE_D, rate.hook));
    pose = now.pose;
    const knot = knotOval(Y0);
    const knotTop = topOf(Y0);
    const loop = wrapToLoop(end, 1);
    const legs = newLoopLegs(knotTop, loop);
    const linkedB = linkedLegB(knotTop, loop[loop.length - 1]);
    parts = {
      tail: blendPath(tail, [...knot.tail, knot.ring[0]], rate.loop, 8).slice(0, -1),
      ring: blendPath(ring, knot.ring, rate.loop, 9),
      legA: rampBlend(legA, [...knot.under, ...legs.a], rate.loop, rate.hook, 8),
      head: wrapToLoop(now, rate.hook),
      legB: [lerp3(legB[0], linkedB[0], rate.hook), ...lerpPath(legB.slice(1), linkedB.slice(1), rate.loop)],
    };
  }
  const w: Waypoint[] = [{ p: parts.tail[0], m: 0 }, ...parts.tail.slice(1).map((p) => ({ p }))];
  parts.ring.forEach((p, i) => w.push(i === 0 ? { p, m: M_TAIL } : { p }));
  parts.legA.forEach((p) => w.push({ p }));
  parts.head.forEach((p, i) => w.push(i === 0 ? { p, tag: "seat" } : i === parts.head.length - 1 ? { p, tag: "wrap-end" } : { p }));
  [...parts.legB, ...BALL].forEach((p) => w.push({ p }));
  return { waypoints: w, pose };
}

/**
 * Paso 6: la aguja vuelve a su sitio (t: 0 → 1) y el bucle nuevo pasa de la
 * garganta al cuerpo. En t = 1 es exactamente el nudo en reposo.
 */
export function slipSettleState(t: number): RigState {
  if (t >= 1) return restState(0);
  const k = smooth(t);
  const pose: HookPose = { tx: COLLAPSE_D * (1 - k), ty: 0, rot: 0 };
  const knot = knotOval(Y0);
  const knotTop = topOf(Y0);
  const loop = hookLoopLocal(lerp(THROAT_X, LOOP_X, k)).map((p) => hookPoint(pose, p));
  const legs = newLoopLegs(knotTop, loop);
  const working = blendPath([P(CX - 4, knotTop - 4, -12.5), P(CX - 16, knotTop - 22, -10), ...BALL], workingYarnRest(REST_POSE, knotTop), k, 7);

  const w: Waypoint[] = [{ p: knot.tail[0], m: 0 }, ...knot.tail.slice(1).map((p) => ({ p }))];
  knot.ring.forEach((p, i) => w.push(i === 0 ? { p, m: M_TAIL } : { p }));
  [...knot.under, ...legs.a].forEach((p) => w.push({ p }));
  loop.forEach((p, i) => w.push(i === 0 ? { p, tag: "loop" } : { p }));
  [...legs.b, ...bridgeRise(knotTop, null), ...working].forEach((p) => w.push({ p }));
  return { waypoints: w, pose };
}
