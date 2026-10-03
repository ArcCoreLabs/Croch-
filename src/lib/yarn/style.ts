/**
 * Aspecto del hilo 3D en el escenario (unidades del viewBox y colores).
 */

export const YARN = {
  /** Radio del hilo (grosor 7). */
  radius: 3.5,
  /** Muestras por segmento entre puntos del hilo. */
  perSegment: 6,
  /** Grosor del contorno (unidades del viewBox). */
  outline: 0.9,
  /** Paso de la torsión (material por vuelta de cada hebra) y número de hebras. */
  pitch: 4.2,
  plies: 3,
  /** Hilo que pasa por detrás de la aguja: se intuye a través del metal. */
  ghostAlpha: 0.2,
  /** Intensidad de la sombra del hilo sobre la aguja. */
  hookShadow: 0.38,
} as const;

/** Colores del hilo: base (azul) y activo (amarillo). */
export const YARN_COLORS = {
  base: "#4d8ef2",
  active: "#f0ba1e",
  /** Respaldo SVG (sin WebGL). */
  outline: "#13305f",
} as const;

export function hexToUnitRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
