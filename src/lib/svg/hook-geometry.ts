import { fmt } from "./path-utils";

/**
 * Generador paramétrico de agujas de croché.
 *
 * La aguja se dibuja horizontal, con la punta a la izquierda (como la ve una
 * persona diestra) y la garganta hacia abajo. Todas las medidas del perfil se
 * expresan en múltiplos del radio del cuerpo (`r`), de modo que el mismo
 * perfil sirve para una ilustración grande o para el reproductor.
 *
 * Todos los perfiles producen trazados con la MISMA estructura de comandos,
 * por lo que se pueden interpolar (morphing) entre tipos de aguja.
 */

export const HOOK_PART_IDS = ["punta", "garganta", "cuerpo", "apoyo", "mango"] as const;
export type HookPartId = (typeof HOOK_PART_IDS)[number];

export const HOOK_MATERIALS = ["aluminio", "acero", "bambu"] as const;
export type HookMaterial = (typeof HOOK_MATERIALS)[number];

export interface HookProfile {
  /** Radio de la cabeza (las cónicas tienen la cabeza más ancha que el cuerpo). */
  headRadius: number;
  /** Radio superior en la zona de la garganta (estrechamiento de las cónicas). */
  neckRadius: number;
  /** Largo de la curva de la punta. */
  tipLength: number;
  /** Largo del labio (la parte que retiene la hebra). */
  lipLength: number;
  /** Profundidad del corte de la garganta. */
  throatDepth: number;
  /** Largo de la rampa de la garganta hasta el cuerpo. */
  throatLength: number;
  /** Largo del cuerpo (zona de trabajo que calibra el tamaño del punto). */
  shaftLength: number;
  grip: {
    /** Largo del apoyo para el pulgar. */
    length: number;
    /** Semiancho visible del apoyo aplanado. */
    halfWidth: number;
  };
  handle: {
    /** `rod`: mango del mismo material; `sleeve`: mango ergonómico envolvente. */
    style: "rod" | "sleeve";
    length: number;
    radius: number;
  };
}

export interface HookGeometryOptions {
  /** Posición de la punta (ápice) en coordenadas del viewBox. */
  tip: readonly [number, number];
  /** Radio del cuerpo en unidades del viewBox. */
  radius: number;
  /** Permite acortar el cuerpo/mango para ilustraciones compactas. */
  shaftLength?: number;
  handleLength?: number;
}

export interface HookPartSpan {
  x0: number;
  x1: number;
  /** Punto del borde superior donde anclar una etiqueta. */
  anchor: [number, number];
}

export interface HookGeometry {
  /** Silueta metálica completa (cabeza + cuerpo + apoyo + varilla). */
  metal: string;
  /** Funda ergonómica del mango (colapsada si el perfil es `rod`). */
  sleeve: string;
  sleeveVisible: boolean;
  /** Brillo especular (trazo, no relleno). */
  shine: string;
  parts: Record<HookPartId, HookPartSpan>;
  /** Punto aproximado donde descansa la hebra dentro de la garganta. */
  throatPoint: [number, number];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const TAPER = 1.4;

export function buildHookGeometry(profile: HookProfile, options: HookGeometryOptions): HookGeometry {
  const [tx, ty] = options.tip;
  const r = options.radius;
  const p = (x: number, y: number) => `${fmt(tx + x * r)} ${fmt(ty + y * r)}`;

  const H = profile.headRadius;
  const N = profile.neckRadius;
  const T = profile.tipLength;
  const L = profile.lipLength;
  const D = profile.throatDepth;
  const Tl = profile.throatLength;
  const shaftLength = options.shaftLength ?? profile.shaftLength;
  const handleLength = options.handleLength ?? profile.handle.length;
  const isSleeve = profile.handle.style === "sleeve";

  // Bajo una funda ergonómica, el metal continúa como una varilla fina.
  const G = isSleeve ? 1 : profile.grip.halfWidth;
  const Rr = isSleeve ? 1 : profile.handle.radius;

  const xs = T + L + Tl; // inicio del cuerpo
  const gs = xs + shaftLength; // inicio del apoyo
  const ge = gs + profile.grip.length; // fin del apoyo
  const xe = ge + TAPER + handleLength; // fin de la varilla

  // Garganta: punto más profundo (P) y punta del labio (B).
  const Px = T + 0.58 * L;
  const Py = 0.7 * H - D;
  const Bx = T + 0.78 * L;
  const By = 0.86 * H;
  const Lbx = 0.85 * T;
  const Lby = 0.98 * H;

  const metal = [
    `M ${p(0, 0.18)}`,
    `C ${p(0, -0.62 * H)} ${p(0.38 * T, -H)} ${p(T, -H)}`,
    `C ${p(T + 0.45 * L, -H)} ${p(T + 0.6 * L, -N)} ${p(T + L, -N)}`,
    `C ${p(T + L + 0.5 * Tl, -N)} ${p(xs - 0.35 * Tl, -1)} ${p(xs, -1)}`,
    `L ${p(gs - TAPER, -1)}`,
    `C ${p(gs - 0.45 * TAPER, -1)} ${p(gs - 0.35 * TAPER, -G)} ${p(gs, -G)}`,
    `L ${p(ge, -G)}`,
    `C ${p(ge + 0.35 * TAPER, -G)} ${p(ge + 0.45 * TAPER, -Rr)} ${p(ge + TAPER, -Rr)}`,
    `L ${p(xe, -Rr)}`,
    `C ${p(xe + 0.9 * Rr, -Rr)} ${p(xe + 0.9 * Rr, Rr)} ${p(xe, Rr)}`,
    `L ${p(ge + TAPER, Rr)}`,
    `C ${p(ge + 0.45 * TAPER, Rr)} ${p(ge + 0.35 * TAPER, G)} ${p(ge, G)}`,
    `L ${p(gs, G)}`,
    `C ${p(gs - 0.35 * TAPER, G)} ${p(gs - 0.45 * TAPER, 1)} ${p(gs - TAPER, 1)}`,
    `L ${p(xs, 1)}`,
    // Rampa de la garganta hasta el fondo del corte.
    `C ${p(xs - 0.5 * Tl, 1)} ${p(Px + 1.1, Py + 0.05)} ${p(Px, Py)}`,
    // Curva cerrada bajo el labio hasta su punta (el labio "mira" al mango).
    `C ${p(Px - 0.32, Py)} ${p(Px - 0.1, By)} ${p(Bx, By)}`,
    // Borde inferior del labio hasta la punta.
    `C ${p(Bx - 0.25 * L, By + 0.12 * H)} ${p(T + 0.15, Lby)} ${p(Lbx, Lby)}`,
    `C ${p(0.3 * T, 0.95 * H)} ${p(0, 0.62 * H)} ${p(0, 0.18)}`,
    "Z",
  ].join(" ");

  // Funda ergonómica: misma estructura siempre; con mango de varilla se colapsa.
  const s0 = gs - 1;
  const E = isSleeve ? profile.handle.radius : Rr;
  const sleeveEnd = isSleeve ? xe : xe;
  const sleeve = [
    `M ${p(s0, -1.05)}`,
    `C ${p(s0 + 1.2, -1.05)} ${p(s0 + 1.6, -E)} ${p(s0 + 3, -E)}`,
    `C ${p(s0 + 4.2, -E)} ${p(s0 + 4.6, -0.84 * E)} ${p(s0 + 6.2, -0.84 * E)}`,
    `C ${p(s0 + 7.8, -0.84 * E)} ${p(s0 + 8.4, -E)} ${p(s0 + 10, -E)}`,
    `L ${p(sleeveEnd, -E)}`,
    `C ${p(sleeveEnd + 1.1 * E, -E)} ${p(sleeveEnd + 1.1 * E, E)} ${p(sleeveEnd, E)}`,
    `L ${p(s0 + 3, E)}`,
    `C ${p(s0 + 1.6, E)} ${p(s0 + 1.2, 1.05)} ${p(s0, 1.05)}`,
    "Z",
  ].join(" ");

  const shine = [
    `M ${p(0.55 * T, -0.6 * H)}`,
    `Q ${p(T, -0.82 * H)} ${p(T + 0.6 * L, -0.62 * N)}`,
    `M ${p(xs + 0.4, -0.52)}`,
    `L ${p(gs - TAPER - 0.4, -0.52)}`,
  ].join(" ");

  const X = (x: number) => tx + x * r;
  const Y = (y: number) => ty + y * r;

  const gripSpan: [number, number] = isSleeve ? [s0 + 4.2, s0 + 8.4] : [gs, ge];
  const handleSpan: [number, number] = isSleeve ? [s0 + 8.4, xe + E] : [ge + TAPER * 0.5, xe + Rr];
  const topAt = (x: number, halfWidth: number): [number, number] => [X(x), Y(-halfWidth)];

  const parts: Record<HookPartId, HookPartSpan> = {
    punta: { x0: X(-0.2), x1: X(T + 0.5 * L), anchor: topAt(T * 0.75, H) },
    garganta: { x0: X(T + 0.5 * L), x1: X(xs), anchor: topAt(T + L + 0.3 * Tl, N) },
    cuerpo: { x0: X(xs), x1: X(isSleeve ? s0 : gs), anchor: topAt((xs + (isSleeve ? s0 : gs)) / 2, 1) },
    apoyo: {
      x0: X(gripSpan[0]),
      x1: X(gripSpan[1]),
      anchor: topAt((gripSpan[0] + gripSpan[1]) / 2, isSleeve ? 0.84 * E : G),
    },
    mango: {
      x0: X(handleSpan[0]),
      x1: X(handleSpan[1]),
      anchor: topAt((handleSpan[0] + handleSpan[1]) / 2, isSleeve ? E : Rr),
    },
  };

  const maxHalf = Math.max(H, G, Rr, isSleeve ? E : 0, 1);

  return {
    metal,
    sleeve,
    sleeveVisible: isSleeve,
    shine,
    parts,
    throatPoint: [X(Px + 0.35), Y(Py + 0.25)],
    bounds: {
      minX: tx,
      minY: Y(-maxHalf),
      maxX: X((isSleeve ? sleeveEnd + 1.1 * E : xe + 0.9 * Rr)),
      maxY: Y(maxHalf),
    },
  };
}
