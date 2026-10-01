"use client";

import { CircleCheck, Trophy } from "lucide-react";
import { progressActions, useLearningProgress } from "@/lib/progress/progress-store";
import { cx } from "@/lib/cx";

/** Marca una técnica como dominada (alimenta la ruta y, en la Fase 4, los requisitos de proyectos). */
export function MasteryButton({ techniqueId, name }: { techniqueId: string; name: string }) {
  const { mastered } = useLearningProgress();
  const isMastered = mastered.includes(techniqueId);

  return (
    <button
      type="button"
      aria-pressed={isMastered}
      onClick={() => progressActions.setMastered(techniqueId, !isMastered)}
      className={cx(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition active:scale-95",
        isMastered
          ? "bg-sage-500 text-white hover:bg-sage-600"
          : "bg-terracotta-500 text-white shadow-md shadow-terracotta-500/25 hover:bg-terracotta-600",
      )}
    >
      {isMastered ? <CircleCheck className="size-4" aria-hidden="true" /> : <Trophy className="size-4" aria-hidden="true" />}
      {isMastered ? `${name}: dominada` : "¡La domino!"}
    </button>
  );
}
