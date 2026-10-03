/**
 * Geometría de un hilo continuo en 3D.
 *
 * Un hilo es una lista de puntos (x, y, z) desde la punta libre (cola) hasta
 * el ovillo. `x`, `y` son coordenadas del viewBox; `z` es la profundidad
 * (positivo = hacia quien mira). Los puntos se unen con una curva Catmull-Rom
 * uniforme, convertida a Bézier cúbicas.
 *
 * La proyección es ortográfica: la sombra SVG y el respaldo sin WebGL usan los
 * `x`, `y` de los mismos puntos de control, así coinciden con el tubo 3D.
 */

/** Curva de un hilo: 4 puntos de control 3D (12 números) por segmento. */
export interface StrandCurve {
  /** Número de puntos del hilo (segmentos = puntos − 1). */
  count: number;
  bezier: Float64Array;
}

/** Muestras densas a lo largo del hilo (para construir el tubo 3D). */
export interface StrandSamples {
  length: number;
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  /** Posición en el hilo: índice de punto con decimales (0 = punta). */
  u: Float64Array;
}

export function buildStrandCurve(points: ArrayLike<number>): StrandCurve {
  const count = Math.floor(points.length / 3);
  if (count < 2) throw new RangeError("Un hilo necesita al menos 2 puntos.");
  const segments = count - 1;
  const bezier = new Float64Array(segments * 12);
  const last = count - 1;
  for (let i = 0; i < segments; i++) {
    const a = Math.max(0, i - 1) * 3;
    const b = i * 3;
    const c = (i + 1) * 3;
    const d = Math.min(last, i + 2) * 3;
    const o = i * 12;
    for (let k = 0; k < 3; k++) {
      const p0 = points[a + k];
      const p1 = points[b + k];
      const p2 = points[c + k];
      const p3 = points[d + k];
      bezier[o + k] = p1;
      bezier[o + 3 + k] = p1 + (p2 - p0) / 6;
      bezier[o + 6 + k] = p2 - (p3 - p1) / 6;
      bezier[o + 9 + k] = p2;
    }
  }
  return { count, bezier };
}

/** Separa `u` en segmento + parámetro local, sin salirse del hilo. */
function locate(curve: StrandCurve, u: number): [number, number] {
  const segments = curve.count - 1;
  if (u <= 0) return [0, 0];
  if (u >= segments) return [segments - 1, 1];
  const seg = Math.floor(u);
  return [seg, u - seg];
}

/** Punto 3D del hilo en la posición `u`. */
export function pointAt(curve: StrandCurve, u: number, out: number[] = [0, 0, 0]): number[] {
  const [seg, t] = locate(curve, u);
  const b = curve.bezier;
  const o = seg * 12;
  const mt = 1 - t;
  const w0 = mt * mt * mt;
  const w1 = 3 * mt * mt * t;
  const w2 = 3 * mt * t * t;
  const w3 = t * t * t;
  for (let k = 0; k < 3; k++) {
    out[k] = w0 * b[o + k] + w1 * b[o + 3 + k] + w2 * b[o + 6 + k] + w3 * b[o + 9 + k];
  }
  return out;
}

export function sampleStrand(curve: StrandCurve, perSegment = 6): StrandSamples {
  const segments = curve.count - 1;
  const length = segments * perSegment + 1;
  const x = new Float64Array(length);
  const y = new Float64Array(length);
  const z = new Float64Array(length);
  const u = new Float64Array(length);
  const p = [0, 0, 0];
  for (let i = 0; i < length; i++) {
    const at = i / perSegment;
    pointAt(curve, at, p);
    x[i] = p[0];
    y[i] = p[1];
    z[i] = p[2];
    u[i] = at;
  }
  return { length, x, y, z, u };
}

const r2 = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? "0" : String(rounded);
};

/** Puntos de control 2D del sub-segmento [ta, tb] del segmento `seg` (de Casteljau). */
function splitSegment(curve: StrandCurve, seg: number, ta: number, tb: number, out: number[]) {
  const b = curve.bezier;
  const o = seg * 12;
  let p0x = b[o];
  let p0y = b[o + 1];
  let p1x = b[o + 3];
  let p1y = b[o + 4];
  let p2x = b[o + 6];
  let p2y = b[o + 7];
  let p3x = b[o + 9];
  let p3y = b[o + 10];
  if (tb < 1) {
    // Parte izquierda [0, tb].
    const ax = p0x + (p1x - p0x) * tb;
    const ay = p0y + (p1y - p0y) * tb;
    const bx = p1x + (p2x - p1x) * tb;
    const by = p1y + (p2y - p1y) * tb;
    const cx = p2x + (p3x - p2x) * tb;
    const cy = p2y + (p3y - p2y) * tb;
    const abx = ax + (bx - ax) * tb;
    const aby = ay + (by - ay) * tb;
    const bcx = bx + (cx - bx) * tb;
    const bcy = by + (cy - by) * tb;
    p3x = abx + (bcx - abx) * tb;
    p3y = aby + (bcy - aby) * tb;
    p1x = ax;
    p1y = ay;
    p2x = abx;
    p2y = aby;
  }
  if (ta > 0) {
    // Parte derecha [ta/tb, 1] de lo que queda.
    const t = tb > 0 ? ta / tb : 0;
    const ax = p0x + (p1x - p0x) * t;
    const ay = p0y + (p1y - p0y) * t;
    const bx = p1x + (p2x - p1x) * t;
    const by = p1y + (p2y - p1y) * t;
    const cx = p2x + (p3x - p2x) * t;
    const cy = p2y + (p3y - p2y) * t;
    const abx = ax + (bx - ax) * t;
    const aby = ay + (by - ay) * t;
    const bcx = bx + (cx - bx) * t;
    const bcy = by + (cy - by) * t;
    p0x = abx + (bcx - abx) * t;
    p0y = aby + (bcy - aby) * t;
    p1x = bcx;
    p1y = bcy;
    p2x = cx;
    p2y = cy;
  }
  out[0] = p0x;
  out[1] = p0y;
  out[2] = p1x;
  out[3] = p1y;
  out[4] = p2x;
  out[5] = p2y;
  out[6] = p3x;
  out[7] = p3y;
}

/**
 * Trazado SVG (proyección 2D) del tramo [u0, u1] del hilo. Coincide exactamente
 * con el mismo tramo dentro del hilo completo. `dx`, `dy` lo trasladan (sombras).
 */
export function curvePath(curve: StrandCurve, u0: number, u1: number, dx = 0, dy = 0): string {
  const segments = curve.count - 1;
  const from = Math.max(0, Math.min(segments, u0));
  const to = Math.max(0, Math.min(segments, u1));
  if (to - from < 1e-6) return "";
  const out = [0, 0, 0, 0, 0, 0, 0, 0];
  let seg = Math.min(segments - 1, Math.floor(from));
  let ta = from - seg;
  let d = "";
  let first = true;
  while (seg < segments) {
    const segEnd = seg + 1;
    const tb = to >= segEnd ? 1 : to - seg;
    if (tb > ta) {
      splitSegment(curve, seg, ta, tb, out);
      if (first) {
        d += `M${r2(out[0] + dx)} ${r2(out[1] + dy)}`;
        first = false;
      }
      d += `C${r2(out[2] + dx)} ${r2(out[3] + dy)} ${r2(out[4] + dx)} ${r2(out[5] + dy)} ${r2(out[6] + dx)} ${r2(out[7] + dy)}`;
    }
    if (to <= segEnd) break;
    seg += 1;
    ta = 0;
  }
  return d;
}
