"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lightbulb, Play, RotateCcw, Sparkles } from "lucide-react";
import type { CompiledStep } from "@/lib/player/types";
import { cx } from "@/lib/cx";
import { PhaseTrack } from "./PhaseTrack";
import { PlayerControls } from "./PlayerControls";
import { ProgressScrubber } from "./ProgressScrubber";
import { PHASE_META } from "./stage-theme";
import { StepStage } from "./StepStage";
import { usePlayback } from "./use-playback";

export interface SvgStepPlayerProps {
  /** Nombre de la técnica o proyecto (accesibilidad y títulos). */
  title: string;
  /** Pasos compilados desde el JSON (`compileTechniqueSteps`). Ilimitados. */
  steps: CompiledStep[];
  initialStep?: number;
  /** Contenido extra al completar el último paso (p. ej. "Marcar como dominada"). */
  completion?: React.ReactNode;
  className?: string;
}

/**
 * Reproductor de pasos animados en SVG.
 *
 * - Cada paso es un micro-movimiento (posición, introducir, lazada, tirar).
 * - La animación es una función pura del progreso (0–1): el slider, el botón
 *   de reproducir y el avance automático solo mueven ese número.
 * - Atajos: espacio (reproducir/pausar), ← → (paso anterior/siguiente).
 */
export function SvgStepPlayer({ title, steps, initialStep = 0, completion, className }: SvgStepPlayerProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const playback = usePlayback(steps, { initialStep, reducedMotion });
  const { state, step } = playback;

  if (!step) return null;

  const stepNumber = state.index + 1;
  const phase = PHASE_META[step.phase];
  const showCompletion = state.finished && playback.isLast && state.status === "ended";

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === " " || event.key === "k") {
      if (target instanceof HTMLButtonElement) return;
      event.preventDefault();
      playback.toggle();
    } else if (event.key === "ArrowRight" && !playback.isLast) {
      event.preventDefault();
      playback.next();
    } else if (event.key === "ArrowLeft" && !playback.isFirst) {
      event.preventDefault();
      playback.prev();
    }
  };

  const startOverlay =
    state.status === "idle" ? (
      <button
        type="button"
        onClick={playback.play}
        className="group absolute inset-0 grid place-items-center bg-cocoa-900/25 transition hover:bg-cocoa-900/10"
        aria-label={`Ver la animación de ${title}`}
      >
        <span className="flex items-center gap-2 rounded-full bg-cream-50 px-5 py-3 text-sm font-extrabold text-cocoa-800 shadow-xl transition group-hover:scale-105 group-active:scale-95">
          <Play className="size-5 fill-current text-terracotta-500" aria-hidden="true" />
          Ver la animación
        </span>
      </button>
    ) : null;

  return (
    <section
      aria-label={`Reproductor de pasos: ${title}`}
      onKeyDown={handleKeyDown}
      className={cx(
        "rounded-[28px] bg-surface p-3 shadow-soft ring-1 ring-line sm:p-4 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-6 lg:p-5",
        className,
      )}
    >
      <div className="space-y-3">
        <div className="relative">
          <StepStage
            step={step}
            stepNumber={stepNumber}
            techniqueName={title}
            progress={playback.progress}
            overlay={startOverlay}
          />
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-cocoa-900/70 py-1 pl-1 pr-2.5 text-[11px] font-bold text-cream-50 backdrop-blur sm:text-xs">
              <span className={cx("grid size-5 place-items-center rounded-full text-[10px] text-white", phase.tone)}>
                {phase.order}
              </span>
              {phase.label}
            </span>
            <span className="rounded-full bg-cocoa-900/70 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-cream-50 backdrop-blur sm:text-xs">
              {stepNumber}/{steps.length}
            </span>
          </div>
        </div>

        <PhaseTrack current={step.phase} />
        <ProgressScrubber progress={playback.progress} onSeek={playback.seek} stepLabel={`el paso ${stepNumber}`} />
        <PlayerControls
          status={state.status}
          isFirst={playback.isFirst}
          isLast={playback.isLast}
          speed={state.speed}
          autoAdvance={state.autoAdvance}
          onPrev={playback.prev}
          onNext={playback.next}
          onToggle={playback.toggle}
          onSpeedChange={playback.setSpeed}
          onAutoAdvanceChange={playback.setAutoAdvance}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:mt-0">
        <div aria-live="polite" className="sr-only">
          {`Paso ${stepNumber} de ${steps.length}: ${step.title}`}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
            className="space-y-3"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-terracotta-600 dark:text-terracotta-300">
              Paso {stepNumber} · {phase.description}
            </p>
            <h3 className="font-display text-2xl font-semibold leading-tight text-ink text-balance">{step.title}</h3>
            <p className="text-base leading-relaxed text-ink-soft text-pretty">{step.instruction}</p>
            {step.tip ? (
              <p className="flex gap-2.5 rounded-2xl bg-honey-100 p-3 text-sm leading-relaxed text-cocoa-800 dark:bg-honey-500/15 dark:text-honey-100">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-honey-600 dark:text-honey-300" aria-hidden="true" />
                <span>{step.tip}</span>
              </p>
            ) : null}
          </motion.article>
        </AnimatePresence>

        <nav aria-label="Pasos" className="mt-auto">
          <ol className="flex flex-wrap gap-1.5">
            {steps.map((item, index) => {
              const meta = PHASE_META[item.phase];
              const isCurrent = index === state.index;
              const isDone = index < state.index || (state.finished && !isCurrent);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => playback.goTo(index)}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Paso ${index + 1}: ${item.title} (${meta.label})`}
                    className={cx(
                      "relative grid size-9 place-items-center rounded-full text-xs font-extrabold tabular-nums transition active:scale-95",
                      isCurrent
                        ? "bg-ink text-canvas shadow-md"
                        : isDone
                          ? "bg-sage-200 text-sage-800 hover:bg-sage-300"
                          : "bg-surface-muted text-ink-soft hover:bg-line",
                    )}
                  >
                    {index + 1}
                    <span className={cx("absolute -bottom-0.5 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full", meta.tone)} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <AnimatePresence>
          {showCompletion ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-sage-100 p-4 text-sage-900 ring-1 ring-sage-200 dark:bg-sage-500/15 dark:text-sage-100 dark:ring-sage-500/30"
            >
              <p className="flex items-center gap-2 font-display text-lg font-semibold">
                <Sparkles className="size-5 text-honey-500" aria-hidden="true" />
                ¡Lección completada!
              </p>
              <p className="mt-1 text-sm">Ahora repite el movimiento con tu aguja hasta que te salga sin mirar.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {completion}
                <button
                  type="button"
                  onClick={playback.restart}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-bold text-ink ring-1 ring-line transition hover:bg-surface-muted"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Repetir lección
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
