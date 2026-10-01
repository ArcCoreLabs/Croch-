"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CircleCheck, Flag, Lock, Play } from "lucide-react";
import type { LearningLevel, TechniqueSummary } from "@/lib/content/view-models";
import { useLearningProgress } from "@/lib/progress/progress-store";
import {
  EXPERIENCE_START_LEVEL,
  computeLevelProgress,
  computeRouteProgress,
} from "@/lib/progress/route-progress";
import { cx } from "@/lib/cx";

interface LearningPathProps {
  levels: LearningLevel[];
  /** Ancla de la lección disponible en esta página (Fase 3: la cadeneta). */
  lessonAnchors: Record<string, string>;
}

/** Ruta de aprendizaje de 0 a 100, alimentada por el JSON y el progreso local. */
export function LearningPath({ levels, lessonAnchors }: LearningPathProps) {
  const progress = useLearningProgress();
  const mastered = useMemo(() => new Set(progress.mastered), [progress.mastered]);
  const score = computeRouteProgress(levels, mastered);
  const startOrder = progress.experience ? EXPERIENCE_START_LEVEL[progress.experience] : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-surface p-4 shadow-soft ring-1 ring-line sm:p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-soft">Tu avance en la ruta</p>
            <p className="font-display text-4xl font-semibold text-ink">
              {score}
              <span className="text-xl text-ink-soft">/100</span>
            </p>
          </div>
          <p className="max-w-[14rem] text-right text-sm text-ink-soft">
            Marca cada técnica como dominada al terminar su lección.
          </p>
        </div>
        <div
          className="mt-3 h-3 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-label="Avance en la ruta"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sage-400 via-honey-400 to-terracotta-500"
            initial={false}
            animate={{ width: `${Math.max(score, 1.5)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="relative mt-1.5 h-4 font-mono text-[10px] font-bold text-ink-soft" aria-hidden="true">
          {[...levels.map((level) => level.range[0]), 100].map((tick) => (
            <span
              key={tick}
              className="absolute top-0"
              style={{ left: `${tick}%`, transform: tick === 0 ? "none" : tick === 100 ? "translateX(-100%)" : "translateX(-50%)" }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>

      <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-0.5 before:bg-line sm:before:left-[23px]">
        {levels.map((level) => {
          const levelProgress = computeLevelProgress(level, mastered);
          const isStart = progress.experience !== null && level.order === startOrder;
          return (
            <li key={level.id} className="relative flex gap-3 sm:gap-4">
              <div
                className={cx(
                  "relative z-10 grid size-10 shrink-0 place-items-center rounded-full font-display text-lg font-semibold ring-4 ring-canvas sm:size-12",
                  levelProgress === 1
                    ? "bg-sage-500 text-white"
                    : isStart
                      ? "bg-terracotta-500 text-white"
                      : "bg-surface text-ink shadow-sm",
                )}
                aria-hidden="true"
              >
                {levelProgress === 1 ? <CircleCheck className="size-5" /> : level.order}
              </div>
              <article
                className={cx(
                  "min-w-0 flex-1 rounded-3xl bg-surface p-4 ring-1 sm:p-5",
                  isStart ? "ring-2 ring-terracotta-400" : "ring-line",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-xs font-bold text-ink-soft">
                    {level.range[0]}–{level.range[1]}
                  </span>
                  {isStart ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-terracotta-500 px-2 py-0.5 text-xs font-extrabold text-white">
                      <Flag className="size-3" aria-hidden="true" /> Empieza aquí
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                  Nivel {level.order} · {level.title}
                </h3>
                <p className="text-sm font-bold text-terracotta-600 dark:text-terracotta-300">{level.subtitle}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{level.description}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {level.techniques.map((technique) => (
                    <TechniqueChip
                      key={technique.id}
                      technique={technique}
                      mastered={mastered.has(technique.id)}
                      href={lessonAnchors[technique.id]}
                    />
                  ))}
                </ul>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TechniqueChip({ technique, mastered, href }: { technique: TechniqueSummary; mastered: boolean; href?: string }) {
  const label = technique.abbr ? `${technique.name} (${technique.abbr})` : technique.name;

  if (mastered) {
    return (
      <li className="inline-flex items-center gap-1.5 rounded-full bg-sage-200 px-3 py-1.5 text-sm font-bold text-sage-800">
        <CircleCheck className="size-4" aria-hidden="true" />
        {label}
        <span className="sr-only">: dominada</span>
      </li>
    );
  }

  if (technique.status === "published" && href) {
    return (
      <li>
        <a
          href={href}
          className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-500 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-terracotta-600 active:scale-95"
        >
          <Play className="size-3.5 fill-current" aria-hidden="true" />
          {label}
          <span className="sr-only">: disponible, ir a la lección</span>
        </a>
      </li>
    );
  }

  return (
    <li
      className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-ink-soft"
      title="Lección en preparación"
    >
      <Lock className="size-3.5" aria-hidden="true" />
      {label}
      <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-70">pronto</span>
    </li>
  );
}
