import type { StrandSamples } from "./curve";

/**
 * Malla de tubo para el hilo (para WebGL).
 *
 * Cada muestra del eje del hilo genera un anillo de `SIDES` vértices. El
 * marco de cada anillo se orienta hacia quien mira (θ = 0 mira a la cámara),
 * así el dibujo de las hebras depende solo del material (`s`) y no "nada" por
 * el hilo cuando éste se mueve.
 *
 * Formato por vértice (9 floats): posición xyz · normal xyz · s (material) ·
 * θ (ángulo alrededor del hilo) · tono.
 */

export const SIDES = 12;
export const FLOATS_PER_VERTEX = 9;
/** Anillos extra que cierran la punta libre como media esfera. */
const CAP_RINGS = 4;

export interface TubeInput {
  samples: StrandSamples;
  radius: number;
  /** Material (unidades de longitud) entre puntos consecutivos del hilo. */
  spacing: number;
  tone: (u: number) => number;
  /** Cierra el inicio del tubo (la punta libre). */
  capStart: boolean;
}

export interface TubeMesh {
  vertices: Float32Array;
  vertexCount: number;
  /** Número de anillos (incluida la tapa). */
  rings: number;
}

/** Índices de triángulos para `rings` anillos consecutivos (no dependen de la forma). */
export function tubeIndices(rings: number): Uint32Array {
  const quads = (rings - 1) * SIDES;
  const out = new Uint32Array(quads * 6);
  let o = 0;
  for (let r = 0; r < rings - 1; r++) {
    for (let k = 0; k < SIDES; k++) {
      const a = r * SIDES + k;
      const b = r * SIDES + ((k + 1) % SIDES);
      const c = a + SIDES;
      const d = b + SIDES;
      out[o++] = a;
      out[o++] = c;
      out[o++] = b;
      out[o++] = b;
      out[o++] = c;
      out[o++] = d;
    }
  }
  return out;
}

export function tubeRingCount(samples: StrandSamples, capStart: boolean): number {
  return samples.length + (capStart ? CAP_RINGS : 0);
}

/** Construye (o rellena `out`) los vértices del tubo. */
export function buildTube(input: TubeInput, out?: Float32Array): TubeMesh {
  const { samples, radius, spacing, tone, capStart } = input;
  const rings = tubeRingCount(samples, capStart);
  const size = rings * SIDES * FLOATS_PER_VERTEX;
  const vertices = out && out.length >= size ? out : new Float32Array(size);
  const n = samples.length;
  const { x, y, z, u } = samples;

  // Tangentes 3D por diferencias centradas.
  const tx = new Float64Array(n);
  const ty = new Float64Array(n);
  const tz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    let dx = x[b] - x[a];
    let dy = y[b] - y[a];
    let dz = z[b] - z[a];
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    tx[i] = dx;
    ty[i] = dy;
    tz[i] = dz;
  }

  let v = 0;
  const writeRing = (px: number, py: number, pz: number, i: number, ringRadius: number, capCos: number, capSin: number, along: number) => {
    // Marco orientado a la cámara: N = componente de (0,0,1) perpendicular a T.
    const ttx = tx[i];
    const tty = ty[i];
    const ttz = tz[i];
    let nx = -ttz * ttx;
    let ny = -ttz * tty;
    let nz = 1 - ttz * ttz;
    let nl = Math.hypot(nx, ny, nz);
    if (nl < 0.08) {
      // El hilo apunta a la cámara: usamos un vector de respaldo perpendicular.
      nx = -tty;
      ny = ttx;
      nz = 0;
      nl = Math.hypot(nx, ny) || 1;
    }
    nx /= nl;
    ny /= nl;
    nz /= nl;
    // B = T × N
    const bx = tty * nz - ttz * ny;
    const by = ttz * nx - ttx * nz;
    const bz = ttx * ny - tty * nx;
    const s = u[i] * spacing + along;
    const t = tone(u[i]);
    for (let k = 0; k < SIDES; k++) {
      // θ ∈ [-π, π): la costura del ángulo queda detrás del hilo, nunca de frente.
      const theta = (k / SIDES) * Math.PI * 2 - Math.PI;
      const c = Math.cos(theta);
      const sn = Math.sin(theta);
      const ox = c * nx + sn * bx;
      const oy = c * ny + sn * by;
      const oz = c * nz + sn * bz;
      // En la tapa, la normal se inclina hacia fuera de la punta.
      const ex = ox * capCos - ttx * capSin;
      const ey = oy * capCos - tty * capSin;
      const ez = oz * capCos - ttz * capSin;
      const el = Math.hypot(ex, ey, ez) || 1;
      vertices[v++] = px + ox * ringRadius;
      vertices[v++] = py + oy * ringRadius;
      vertices[v++] = pz + oz * ringRadius;
      vertices[v++] = ex / el;
      vertices[v++] = ey / el;
      vertices[v++] = ez / el;
      vertices[v++] = s;
      vertices[v++] = theta;
      vertices[v++] = t;
    }
  };

  if (capStart) {
    // Media esfera delante de la punta: anillos cada vez más pequeños.
    for (let c = CAP_RINGS; c >= 1; c--) {
      const angle = (c / CAP_RINGS) * (Math.PI / 2) * 0.96;
      const back = Math.sin(angle) * radius;
      const ringRadius = Math.cos(angle) * radius;
      writeRing(x[0] - tx[0] * back, y[0] - ty[0] * back, z[0] - tz[0] * back, 0, ringRadius, Math.cos(angle), Math.sin(angle), -back);
    }
  }
  for (let i = 0; i < n; i++) writeRing(x[i], y[i], z[i], i, radius, 1, 0, 0);

  return { vertices, vertexCount: rings * SIDES, rings };
}
