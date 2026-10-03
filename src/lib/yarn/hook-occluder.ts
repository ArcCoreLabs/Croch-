import type { HookProfile } from "@/lib/svg/hook-geometry";

/**
 * Volumen aproximado de la aguja para WebGL (no se ve: solo tapa en
 * profundidad lo que pasa por detrás y recibe la sombra del hilo).
 *
 * Coordenadas locales: origen en la punta en reposo, x hacia el mango.
 * Sección: semicírculo arriba (radio `top`) y semielipse abajo (radio
 * `bottom`), que en la garganta se reduce para dejar sitio al hilo.
 */

const RING_SIDES = 16;

export interface OccluderMesh {
  /** posición xyz + normal xyz por vértice. */
  vertices: Float32Array;
  indices: Uint32Array;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function buildHookOccluder(profile: HookProfile, radius: number, length = 260): OccluderMesh {
  const r = radius;
  const H = profile.headRadius;
  const N = profile.neckRadius;
  const T = profile.tipLength;
  const L = profile.lipLength;
  const Tl = profile.throatLength;
  const Px = T + 0.58 * L;
  const Py = 0.7 * H - profile.throatDepth;
  const xs = T + L + Tl;
  const capX = 0.45 * T;

  const stations: number[] = [];
  for (let x = 0; x <= xs * r + 6; x += 0.6) stations.push(x);
  for (let x = xs * r + 8; x <= length; x += 8) stations.push(x);

  const profileAt = (x: number) => {
    const xr = x / r;
    let top: number;
    let bottom: number;
    if (xr < capX) {
      const f = Math.sqrt(Math.max(0.03, 1 - ((capX - xr) / capX) ** 2));
      top = H * f;
      bottom = 0.98 * H * f;
    } else {
      const neck = xr < T + L ? H + (N - H) * smooth((xr - T) / L) : N + (1 - N) * smooth((xr - T - L) / Tl);
      top = neck;
      if (xr < Px) bottom = 0.98 * H;
      else if (xr < xs) bottom = Py + (1 - Py) * smooth((xr - Px) / (xs - Px));
      else bottom = 1;
    }
    return { top: top * r, bottom: Math.max(0.05, bottom) * r };
  };

  const vertices = new Float32Array(stations.length * RING_SIDES * 6);
  let v = 0;
  for (const x of stations) {
    const { top, bottom } = profileAt(x);
    for (let k = 0; k < RING_SIDES; k++) {
      const phi = (k / RING_SIDES) * Math.PI * 2;
      const up = Math.sin(phi);
      const ry = up >= 0 ? top : bottom;
      const y = -up * ry;
      const z = Math.cos(phi) * top;
      const ny = y / (ry * ry);
      const nz = z / (top * top);
      const nl = Math.hypot(ny, nz) || 1;
      vertices[v++] = x;
      vertices[v++] = y;
      vertices[v++] = z;
      vertices[v++] = 0;
      vertices[v++] = ny / nl;
      vertices[v++] = nz / nl;
    }
  }
  const indices = new Uint32Array((stations.length - 1) * RING_SIDES * 6);
  let o = 0;
  for (let s = 0; s < stations.length - 1; s++) {
    for (let k = 0; k < RING_SIDES; k++) {
      const a = s * RING_SIDES + k;
      const b = s * RING_SIDES + ((k + 1) % RING_SIDES);
      indices[o++] = a;
      indices[o++] = a + RING_SIDES;
      indices[o++] = b;
      indices[o++] = b;
      indices[o++] = a + RING_SIDES;
      indices[o++] = b + RING_SIDES;
    }
  }
  return { vertices, indices };
}
