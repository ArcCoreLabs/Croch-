import { Lightbulb, Target, TriangleAlert } from "lucide-react";
import type { TechniqueLesson } from "@/lib/content/view-models";
import { SvgStepPlayer } from "@/components/player/SvgStepPlayer";
import { MasteryButton } from "./MasteryButton";

/** Primera lección: el reproductor alimentado por el JSON + consejos del taller. */
export function FirstLesson({ lesson }: { lesson: TechniqueLesson }) {
  const { technique, steps } = lesson;

  return (
    <div className="space-y-6">
      <SvgStepPlayer
        title={technique.name}
        steps={steps}
        completion={<MasteryButton techniqueId={technique.id} name={technique.name} />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard title="Consejos del taller" items={technique.tips} tone="tip" />
        <InfoCard title="Errores frecuentes" items={technique.commonMistakes} tone="warning" />
        <div className="rounded-3xl bg-ink p-5 text-canvas">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider opacity-80">
            <Target className="size-4" aria-hidden="true" /> Reto de hoy
          </p>
          <p className="mt-2 font-display text-2xl font-semibold leading-tight">20 cadenetas del mismo tamaño</p>
          <p className="mt-2 text-sm leading-relaxed opacity-85">
            Teje una cadena de 20 sin mirar el reproductor. Si todas las «V» se parecen, tu tensión ya es constante.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, items, tone }: { title: string; items: string[]; tone: "tip" | "warning" }) {
  if (items.length === 0) return null;
  const Icon = tone === "tip" ? Lightbulb : TriangleAlert;
  return (
    <div className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-soft">
        <Icon className={tone === "tip" ? "size-4 text-honey-500" : "size-4 text-terracotta-500"} aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-terracotta-400" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
