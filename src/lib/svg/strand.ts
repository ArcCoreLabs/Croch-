import { fmt } from "./path-utils";

/**
 * Hilos continuos: un hilo se describe como una lista de puntos por los que
 * pasa (de la punta de la cola hacia el ovillo) y se dibuja como una curva
 * suave Catmull-Rom convertida a Bézier cúbicas.
 *
 * Un "tramo" [from, to] de ese hilo se dibuja usando los vecinos de fuera del
 * tramo, así dos tramos contiguos encajan sin costura: es exactamente la misma
 * curva. Como la conversión es lineal en los puntos, interpolar los trazados
 * de dos fotogramas equivale a interpolar los puntos: los tramos de un mismo
 * hilo siguen unidos durante todo el morphing.
 */

export type StrandPoint = readonly [number, number];

export function strandPath(points: readonly StrandPoint[], from = 0, to = points.length - 1): string {
  if (points.length < 2) throw new RangeError("Un hilo necesita al menos 2 puntos.");
  if (!(Number.isInteger(from) && Number.isInteger(to)) || from < 0 || to > points.length - 1 || from >= to) {
    throw new RangeError(`Tramo fuera de rango: [${from}, ${to}] en un hilo de ${points.length} puntos.`);
  }
  const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))];
  const parts = [`M ${fmt(at(from)[0])} ${fmt(at(from)[1])}`];
  for (let i = from; i < to; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    const c1 = `${fmt(x1 + (x2 - x0) / 6)} ${fmt(y1 + (y2 - y0) / 6)}`;
    const c2 = `${fmt(x2 - (x3 - x1) / 6)} ${fmt(y2 - (y3 - y1) / 6)}`;
    parts.push(`C ${c1}, ${c2}, ${fmt(x2)} ${fmt(y2)}`);
  }
  return parts.join(" ");
}
