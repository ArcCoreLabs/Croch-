import type { LearningLevel } from "@/lib/content/view-models";

/**
 * Lógica pura de la ruta "de 0 a 100".
 * Cada nivel aporta su tramo (p. ej. 0–15) repartido entre sus técnicas.
 */

export const EXPERIENCES = ["zero", "basics", "round", "amigurumi"] as const;
export type Experience = (typeof EXPERIENCES)[number];

/** Nivel recomendado para empezar según la experiencia declarada. */
export const EXPERIENCE_START_LEVEL: Record<Experience, number> = {
  zero: 0,
  basics: 1,
  round: 2,
  amigurumi: 3,
};

export function computeRouteProgress(levels: readonly LearningLevel[], mastered: ReadonlySet<string>): number {
  let total = 0;
  for (const level of levels) {
    const span = level.range[1] - level.range[0];
    if (level.techniques.length === 0) continue;
    const done = level.techniques.filter((t) => mastered.has(t.id)).length;
    total += (span * done) / level.techniques.length;
  }
  return Math.min(100, Math.round(total));
}

export function computeLevelProgress(level: LearningLevel, mastered: ReadonlySet<string>): number {
  if (level.techniques.length === 0) return 0;
  const done = level.techniques.filter((t) => mastered.has(t.id)).length;
  return done / level.techniques.length;
}

/** Primera técnica publicada y no dominada a partir del nivel recomendado. */
export function findNextTechnique(levels: readonly LearningLevel[], mastered: ReadonlySet<string>, fromOrder = 0) {
  for (const level of levels) {
    if (level.order < fromOrder) continue;
    const next = level.techniques.find((t) => t.status === "published" && !mastered.has(t.id));
    if (next) return { level, technique: next };
  }
  return null;
}
