import { ArrowDown, Route } from "lucide-react";
import type { LearningLevel } from "@/lib/content/view-models";
import { ExperiencePicker } from "./ExperiencePicker";
import { HeroIllustration } from "./HeroIllustration";

interface HeroProps {
  levels: LearningLevel[];
  stats: { levels: number; techniques: number; lessonSteps: number };
}

export function Hero({ levels, stats }: HeroProps) {
  return (
    <section aria-labelledby="hero-titulo" className="grid items-center gap-8 pb-6 pt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:pt-10">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sage-700 dark:bg-sage-500/15 dark:text-sage-200">
          <span className="size-1.5 rounded-full bg-sage-500" aria-hidden="true" />
          Desde cero · 100 % interactivo
        </p>
        <h1
          id="hero-titulo"
          className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-ink text-balance sm:text-6xl"
        >
          Aprende croché desde la <span className="italic text-terracotta-500">primera puntada</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft text-pretty">
          Cada punto, dividido en micro-movimientos animados que puedes pausar, rebobinar y repetir:{" "}
          <strong className="text-ink">posición, introducir, lazada y tirar.</strong> Sin vídeos y a tu ritmo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#primera-puntada"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-terracotta-500 px-6 font-extrabold text-white shadow-lg shadow-terracotta-500/30 transition hover:bg-terracotta-600 active:scale-95"
          >
            Empezar mi primera cadeneta
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>
          <a
            href="#ruta"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-surface px-5 font-bold text-ink ring-1 ring-line transition hover:bg-surface-muted"
          >
            <Route className="size-4" aria-hidden="true" />
            Ver la ruta de 0 a 100
          </a>
        </div>
        <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
          {[
            { value: stats.levels, label: "niveles" },
            { value: stats.techniques, label: "técnicas en la ruta" },
            { value: stats.lessonSteps, label: "micro-pasos en tu 1.ª lección" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-surface/70 p-3 ring-1 ring-line">
              <dt className="sr-only">{item.label}</dt>
              <dd className="font-display text-2xl font-semibold text-ink">{item.value}</dd>
              <dd className="text-xs font-semibold leading-tight text-ink-soft">{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-4">
        <div className="mx-auto max-w-md lg:max-w-none">
          <HeroIllustration />
        </div>
        <ExperiencePicker levels={levels} />
      </div>
    </section>
  );
}
