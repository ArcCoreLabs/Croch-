/**
 * Kit de geometría para animar un hilo en 3D (solo autoría, no se usa en la app).
 *
 * Cada fotograma se describe con un "esqueleto": puntos de paso 3D por los
 * que va el hilo, desde la punta libre hasta el ovillo. Algunos llevan un
 * ancla de MATERIAL (`m`): qué trozo del hilo real pasa por ahí, medido en
 * unidades desde la punta. Entre anclas, el material se reparte por longitud
 * de arco.
 *
 * Así el hilo se comporta como un hilo: si un bucle se agranda, el material
 * sale del lado que no está anclado (el ovillo) y la textura de las hebras se
 * desliza por la curva, igual que se ve al tejer.
 */

export type Vec3 = [number, number, number];

export interface Waypoint {
  p: Vec3;
  /** Material (desde la punta) que pasa por este punto. */
  m?: number;
  /** Nombre para consultar qué material pasa por aquí (tramos activos, etiquetas). */
  tag?: string;
}

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const length3 = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const dist3 = (a: Vec3, b: Vec3) => length3(sub(a, b));
export const normalize = (a: Vec3): Vec3 => {
  const l = length3(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (value: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value));
export const smooth = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
/** Rampa suave de 0 a 1 entre `a` y `b`. */
export const ramp = (value: number, a: number, b: number) => smooth((value - a) / (b - a));
export const deg = (degrees: number) => (degrees * Math.PI) / 180;

/** Punto de una circunferencia 3D: centro, eje del ángulo 0 (`e1`) y del ángulo 90° (`e2`). */
export function onCircle(center: Vec3, e1: Vec3, e2: Vec3, radius: number, angleDeg: number): Vec3 {
  const a = deg(angleDeg);
  return add(center, add(scale(e1, radius * Math.cos(a)), scale(e2, radius * Math.sin(a))));
}

/** Arco de `from` a `to` grados (incluidos) con `n` puntos. */
export function arc(center: Vec3, e1: Vec3, e2: Vec3, radius: number, from: number, to: number, n: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) out.push(onCircle(center, e1, e2, radius, from + ((to - from) * i) / (n - 1)));
  return out;
}

/** Catmull-Rom centrípeta en 3D: curva suave densa que pasa por todos los puntos. */
export function smoothPath(points: readonly Vec3[], perSpan = 14): { dense: Vec3[]; knots: number[] } {
  if (points.length < 2) return { dense: [...points], knots: points.map(() => 0) };
  const dense: Vec3[] = [];
  const knots: number[] = [];
  const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? sub(scale(points[0], 2), points[1]) : at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = i + 2 > points.length - 1 ? sub(scale(points[points.length - 1], 2), points[points.length - 2]) : at(i + 2);
    const t0 = 0;
    const t1 = t0 + Math.sqrt(Math.max(1e-6, dist3(p0, p1)));
    const t2 = t1 + Math.sqrt(Math.max(1e-6, dist3(p1, p2)));
    const t3 = t2 + Math.sqrt(Math.max(1e-6, dist3(p2, p3)));
    knots.push(dense.length);
    for (let k = 0; k < perSpan; k++) {
      const t = t1 + ((t2 - t1) * k) / perSpan;
      const a1 = lerp3(p0, p1, (t - t0) / (t1 - t0));
      const a2 = lerp3(p1, p2, (t - t1) / (t2 - t1));
      const a3 = lerp3(p2, p3, (t - t2) / (t3 - t2));
      const b1 = lerp3(a1, a2, (t - t0) / (t2 - t0));
      const b2 = lerp3(a2, a3, (t - t1) / (t3 - t1));
      dense.push(lerp3(b1, b2, (t - t1) / (t2 - t1)));
    }
  }
  knots.push(dense.length);
  dense.push(points[points.length - 1]);
  return { dense, knots };
}

/**
 * Coloca `count` puntos de material (separados `spacing`) sobre el esqueleto.
 * Entre anclas el material se estira o comprime un poco; fuera de ellas va 1:1.
 */
interface MaterialMap {
  dense: Vec3[];
  knots: number[];
  arcLength: number[];
  anchors: { s: number; m: number }[];
}

function materialMap(waypoints: readonly Waypoint[]): MaterialMap {
  const { dense, knots } = smoothPath(waypoints.map((w) => w.p));
  const arcLength: number[] = [0];
  for (let i = 1; i < dense.length; i++) arcLength.push(arcLength[i - 1] + dist3(dense[i - 1], dense[i]));
  const anchors: { s: number; m: number }[] = [];
  waypoints.forEach((w, i) => {
    if (w.m !== undefined) anchors.push({ s: arcLength[knots[i]], m: w.m });
  });
  if (anchors.length === 0 || anchors[0].m > 0) anchors.unshift({ s: 0, m: 0 });
  return { dense, knots, arcLength, anchors };
}

/** Material que pasa por cada punto de paso con `tag`. */
export function materialTags(waypoints: readonly Waypoint[]): Record<string, number> {
  const { knots, arcLength, anchors } = materialMap(waypoints);
  const mAtS = (s: number) => {
    if (s <= anchors[0].s) return anchors[0].m - (anchors[0].s - s);
    for (let i = 1; i < anchors.length; i++) {
      if (s <= anchors[i].s) {
        const a = anchors[i - 1];
        const b = anchors[i];
        return a.m + ((s - a.s) / (b.s - a.s)) * (b.m - a.m);
      }
    }
    const last = anchors[anchors.length - 1];
    return last.m + (s - last.s);
  };
  const out: Record<string, number> = {};
  waypoints.forEach((w, i) => {
    if (w.tag) out[w.tag] = mAtS(arcLength[knots[i]]);
  });
  return out;
}

export function layoutMaterial(waypoints: readonly Waypoint[], count: number, spacing: number): Vec3[] {
  const { dense, knots } = smoothPath(waypoints.map((w) => w.p));
  const arcLength: number[] = [0];
  for (let i = 1; i < dense.length; i++) arcLength.push(arcLength[i - 1] + dist3(dense[i - 1], dense[i]));
  const total = arcLength[arcLength.length - 1];

  const anchors: { s: number; m: number }[] = [];
  waypoints.forEach((w, i) => {
    if (w.m !== undefined) anchors.push({ s: arcLength[knots[i]], m: w.m });
  });
  if (anchors.length === 0 || anchors[0].m > 0) anchors.unshift({ s: 0, m: 0 });
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].m <= anchors[i - 1].m || anchors[i].s <= anchors[i - 1].s) {
      throw new Error(`Anclas de material no crecientes: ${JSON.stringify(anchors)}`);
    }
  }

  const sAtMaterial = (m: number) => {
    if (m <= anchors[0].m) return anchors[0].s - (anchors[0].m - m);
    for (let i = 1; i < anchors.length; i++) {
      if (m <= anchors[i].m) {
        const a = anchors[i - 1];
        const b = anchors[i];
        return a.s + ((m - a.m) / (b.m - a.m)) * (b.s - a.s);
      }
    }
    const last = anchors[anchors.length - 1];
    return last.s + (m - last.m);
  };

  const pointAtS = (s: number): Vec3 => {
    if (s <= 0) {
      const dir = normalize(sub(dense[1], dense[0]));
      return add(dense[0], scale(dir, s));
    }
    if (s >= total) {
      const dir = normalize(sub(dense[dense.length - 1], dense[dense.length - 2]));
      return add(dense[dense.length - 1], scale(dir, s - total));
    }
    let lo = 0;
    let hi = arcLength.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arcLength[mid] < s) lo = mid;
      else hi = mid;
    }
    const f = (s - arcLength[lo]) / (arcLength[hi] - arcLength[lo] || 1);
    return lerp3(dense[lo], dense[hi], f);
  };

  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) out.push(pointAtS(sAtMaterial(i * spacing)));
  return out;
}

/** Longitud de arco del esqueleto entre dos de sus puntos de paso. */
export function skeletonLength(waypoints: readonly Waypoint[], from = 0, to = waypoints.length - 1): number {
  const { dense, knots } = smoothPath(waypoints.map((w) => w.p));
  let total = 0;
  for (let i = knots[from] + 1; i <= knots[to]; i++) total += dist3(dense[i - 1], dense[i]);
  return total;
}

/**
 * Relajación en profundidad: donde dos partes del hilo (no vecinas) quedan más
 * cerca que `minDistance`, las separa SOLO en z (la de delante un poco más
 * delante, la de detrás más atrás) y después suaviza z a lo largo del hilo.
 * La vista frontal del diseño no cambia; los cruces ganan holgura.
 */
export function relaxDepth(
  points: Vec3[],
  options: { minDistance: number; iterations?: number; skip?: number; smoothing?: number },
): Vec3[] {
  const { minDistance, iterations = 80, skip = 3, smoothing = 0.25 } = options;
  const out = points.map((p) => [...p] as Vec3);
  const n = out.length;
  const min2 = minDistance * minDistance;
  for (let it = 0; it < iterations; it++) {
    let worst = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + skip; j < n; j++) {
        const dx = out[j][0] - out[i][0];
        const dy = out[j][1] - out[i][1];
        const planar2 = dx * dx + dy * dy;
        if (planar2 >= min2) continue;
        const need = Math.sqrt(min2 - planar2);
        const dz = out[j][2] - out[i][2];
        const deficit = need - Math.abs(dz);
        if (deficit <= 0) continue;
        worst = Math.max(worst, deficit);
        const dir = dz === 0 ? (j > i ? 1 : -1) : Math.sign(dz);
        out[i][2] -= (dir * deficit) / 2;
        out[j][2] += (dir * deficit) / 2;
      }
    }
    // Suavizado de z (sin tocar los extremos).
    const z = out.map((p) => p[2]);
    for (let i = 1; i < n - 1; i++) out[i][2] = z[i] + ((z[i - 1] + z[i + 1]) / 2 - z[i]) * smoothing;
    if (worst < 0.05) break;
  }
  return out;
}

/**
 * Curvatura máxima: un hilo de grosor W no se dobla más cerrado que su propio
 * radio sin aplastarse (y el tubo se pellizcaría). Donde el giro entre dos
 * tramos supera `maxDeg`, el punto se acerca al centro de sus vecinos; al
 * repetirlo, la curva se reparte en varios puntos y queda redondeada.
 */
export function limitBend(points: readonly Vec3[], maxDeg = 70, iterations = 80): Vec3[] {
  const out = points.map((p) => [...p] as Vec3);
  const cosMax = Math.cos(deg(maxDeg));
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (let i = 1; i < out.length - 1; i++) {
      const a = sub(out[i], out[i - 1]);
      const b = sub(out[i + 1], out[i]);
      const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (length3(a) * length3(b) || 1);
      if (c >= cosMax) continue;
      out[i] = lerp3(out[i], lerp3(out[i - 1], out[i + 1], 0.5), 0.3);
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

/** Remuestrea una polilínea suave a `count` puntos equiespaciados (para mezclar formas). */
export function resample(points: readonly Vec3[], count: number): Vec3[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: count }, () => [...points[0]] as Vec3);
  const { dense } = smoothPath(points, 8);
  const arcLength = [0];
  for (let i = 1; i < dense.length; i++) arcLength.push(arcLength[i - 1] + dist3(dense[i - 1], dense[i]));
  const total = arcLength[arcLength.length - 1];
  const out: Vec3[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = count === 1 ? 0 : (total * k) / (count - 1);
    while (j < arcLength.length - 2 && arcLength[j + 1] < target) j++;
    const span = arcLength[j + 1] - arcLength[j] || 1;
    out.push(lerp3(dense[j], dense[j + 1], Math.min(1, Math.max(0, (target - arcLength[j]) / span))));
  }
  return out;
}

/** Mezcla dos tramos (remuestreados al mismo número de puntos) con peso `t`. */
export function blendPath(a: readonly Vec3[], b: readonly Vec3[], t: number, count = Math.max(a.length, b.length)): Vec3[] {
  // En los extremos, el recorrido original (así un estado coincide con el de la pieza que lo define).
  if (t <= 0) return a.map((p) => [...p] as Vec3);
  if (t >= 1) return b.map((p) => [...p] as Vec3);
  const ra = resample(a, count);
  const rb = resample(b, count);
  return ra.map((p, i) => lerp3(p, rb[i], t));
}
