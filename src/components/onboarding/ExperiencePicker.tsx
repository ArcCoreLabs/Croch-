"use client";

import { Footprints, Repeat, Sparkles, Sprout, type LucideIcon } from "lucide-react";
import type { LearningLevel } from "@/lib/content/view-models";
import { progressActions, useLearningProgress } from "@/lib/progress/progress-store";
import { EXPERIENCE_START_LEVEL, type Experience } from "@/lib/progress/route-progress";
import { cx } from "@/lib/cx";

const OPTIONS: { value: Experience; title: string; hint: string; Icon: LucideIcon }[] = [
  { value: "zero", title: "Nunca he tejido", hint: "Empezamos por sujetar la aguja.", Icon: Sprout },
  { value: "basics", title: "Sé hacer cadenetas", hint: "Vamos a los puntos esenciales.", Icon: Footprints },
  { value: "round", title: "Ya tejo en redondo", hint: "Anillo mágico, aumentos y espiral.", Icon: Repeat },
  { value: "amigurumi", title: "Ya hice amigurumis", hint: "Acabados, texturas y diseño.", Icon: Sparkles },
];

/** "¿Desde dónde empiezas?": personaliza el punto de partida en la ruta. */
export function ExperiencePicker({ levels }: { levels: LearningLevel[] }) {
  const { experience } = useLearningProgress();
  const startLevel = experience ? levels.find((l) => l.order === EXPERIENCE_START_LEVEL[experience]) : null;

  return (
    <fieldset className="rounded-3xl bg-surface/80 p-4 shadow-soft ring-1 ring-line backdrop-blur sm:p-5">
      <legend className="sr-only">¿Desde dónde empiezas?</legend>
      <p className="font-display text-lg font-semibold text-ink" aria-hidden="true">
        ¿Desde dónde empiezas?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {OPTIONS.map(({ value, title, hint, Icon }) => {
          const checked = experience === value;
          return (
            <label
              key={value}
              className={cx(
                "group relative flex cursor-pointer flex-col gap-1 rounded-2xl p-3 ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-terracotta-400",
                checked ? "bg-terracotta-500 text-white ring-terracotta-500" : "bg-canvas text-ink ring-line hover:ring-terracotta-300",
              )}
            >
              <input
                type="radio"
                name="experiencia"
                value={value}
                checked={checked}
                onChange={() => progressActions.setExperience(value)}
                className="sr-only"
              />
              <Icon className={cx("size-5", checked ? "text-white" : "text-terracotta-500")} aria-hidden="true" />
              <span className="text-sm font-extrabold leading-tight">{title}</span>
              <span className={cx("text-xs leading-snug", checked ? "text-white/85" : "text-ink-soft")}>{hint}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 min-h-5 text-sm text-ink-soft" aria-live="polite">
        {startLevel ? (
          <>
            Tu punto de partida:{" "}
            <a href="#ruta" className="font-bold text-terracotta-600 underline-offset-4 hover:underline dark:text-terracotta-300">
              Nivel {startLevel.order} · {startLevel.title}
            </a>
          </>
        ) : (
          "Elige una opción y te marcamos dónde empezar."
        )}
      </p>
    </fieldset>
  );
}
