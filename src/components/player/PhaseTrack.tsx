import type { Phase } from "@/lib/player/types";
import { cx } from "@/lib/cx";
import { PHASE_META, PHASE_ORDER } from "./stage-theme";

/**
 * Indicador de los 4 micro-movimientos; resalta el del paso actual.
 * En móvil solo la fase actual muestra su nombre para que nada se corte.
 */
export function PhaseTrack({ current }: { current: Phase }) {
  return (
    <ol className="flex gap-1.5" aria-label="Micro-movimientos de la puntada">
      {PHASE_ORDER.map((phase) => {
        const meta = PHASE_META[phase];
        const isCurrent = phase === current;
        return (
          <li
            key={phase}
            aria-current={isCurrent ? "step" : undefined}
            title={`${meta.order}. ${meta.label}: ${meta.description}`}
            className={cx(
              "flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1.5 text-xs font-bold transition-[background-color,color,flex-grow] duration-300 sm:flex-1 sm:px-2",
              isCurrent ? "flex-1 bg-ink text-canvas shadow-sm" : "bg-surface-muted text-ink-soft",
            )}
          >
            <span
              className={cx(
                "grid size-5 shrink-0 place-items-center rounded-full text-[10px] text-white",
                meta.tone,
                !isCurrent && "opacity-70",
              )}
              aria-hidden="true"
            >
              {meta.order}
            </span>
            <span className={cx("truncate", isCurrent ? "inline" : "sr-only sm:not-sr-only sm:inline")}>{meta.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
