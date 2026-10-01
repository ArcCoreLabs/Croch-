"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import type { YarnWeightView } from "@/lib/content/view-models";
import { cx } from "@/lib/cx";
import { YarnStrand } from "@/components/illustrations/YarnStrand";

const DEFAULT_CYC = 3;
/** Escala visual de los diámetros de aguja: 1 mm = 4 px. */
const PX_PER_MM = 4;

function formatHook([min, max]: [number, number | null]) {
  return max === null ? `${min} mm o más` : `${min}–${max} mm`;
}

/** Selector de grosores (sistema estándar 0–7) con hebra y agujas a escala. */
export function YarnWeightGuide({ weights }: { weights: YarnWeightView[] }) {
  const groupName = useId();
  const [selectedId, setSelectedId] = useState(() => (weights.find((w) => w.cyc === DEFAULT_CYC) ?? weights[0]).id);
  const selected = weights.find((w) => w.id === selectedId) ?? weights[0];
  const [minMm, maxMm] = selected.hookMm;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
      <fieldset className="rounded-3xl bg-surface p-2 ring-1 ring-line">
        <legend className="sr-only">Grosor del hilo</legend>
        {weights.map((weight) => {
          const isActive = weight.id === selectedId;
          return (
            <label
              key={weight.id}
              className={cx(
                "flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-1.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-terracotta-400",
                isActive ? "bg-terracotta-100 dark:bg-terracotta-500/20" : "hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name={`${groupName}-grosor`}
                value={weight.id}
                checked={isActive}
                onChange={() => setSelectedId(weight.id)}
                className="sr-only"
              />
              <span
                className={cx(
                  "grid size-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-extrabold",
                  isActive ? "bg-terracotta-500 text-white" : "bg-surface-muted text-ink-soft",
                )}
                aria-hidden="true"
              >
                {weight.cyc}
              </span>
              <span className="w-24 shrink-0 text-sm font-bold text-ink sm:w-28">
                <span className="sr-only">{weight.cyc} · </span>
                {weight.name}
              </span>
              <YarnStrand
                width={weight.strandWidth * 1.6}
                className="h-7 min-w-0 flex-1"
                color={isActive ? "#c8664a" : "#b9a796"}
                shade={isActive ? "#84402f" : "#6c5d53"}
                animateIn={false}
              />
            </label>
          );
        })}
      </fieldset>

      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={selected.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-line"
          aria-live="polite"
        >
          <div className="flex items-start gap-4">
            <SkeinBadge number={selected.cyc} />
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-semibold text-ink">{selected.name}</h3>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {selected.aka.map((alias) => (
                  <span key={alias} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold text-ink-soft">
                    {alias}
                  </span>
                ))}
              </p>
            </div>
          </div>

          <YarnStrand width={selected.strandWidth * 2.2} className="mt-4 h-16 w-full" />

          <div className="mt-4 rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-soft">Aguja recomendada</p>
            <div className="mt-2 flex items-center gap-4">
              <p className="font-display text-3xl font-semibold text-ink">{formatHook(selected.hookMm)}</p>
              <div className="flex items-end gap-2" aria-hidden="true">
                <HookDot mm={minMm} />
                {maxMm !== null ? <HookDot mm={maxMm} /> : null}
              </div>
            </div>
            <p className="mt-1 text-xs text-ink-soft">Círculos a escala real aproximada del diámetro de la aguja.</p>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            <strong className="text-ink">Usos: </strong>
            {selected.uses}
          </p>
          <p className="mt-3 flex gap-2.5 rounded-2xl bg-terracotta-100 p-3 text-sm leading-relaxed text-cocoa-800 dark:bg-terracotta-500/15 dark:text-terracotta-100">
            <Heart className="mt-0.5 size-4 shrink-0 text-terracotta-500" aria-hidden="true" />
            <span>
              <strong>Para amigurumi: </strong>
              {selected.amigurumi}
            </span>
          </p>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

function HookDot({ mm }: { mm: number }) {
  const size = Math.max(4, mm * PX_PER_MM);
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className="block rounded-full bg-gradient-to-b from-slate-200 to-slate-500 ring-1 ring-slate-600/40"
        style={{ width: size, height: size }}
      />
      <span className="font-mono text-[10px] font-bold text-ink-soft">{mm}</span>
    </span>
  );
}

/** Etiqueta de ovillo con el número estándar, al estilo de las etiquetas comerciales. */
function SkeinBadge({ number }: { number: number }) {
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0" role="img" aria-label={`Grosor ${number}`}>
      <ellipse cx="32" cy="34" rx="27" ry="24" fill="#f4eadb" stroke="#c8664a" strokeWidth="2.5" />
      {[-12, -4, 4, 12].map((offset) => (
        <path
          key={offset}
          d={`M ${10 + Math.abs(offset) / 2} ${34 + offset} Q 32 ${26 + offset} ${54 - Math.abs(offset) / 2} ${34 + offset}`}
          fill="none"
          stroke="#e9a98f"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      <circle cx="32" cy="34" r="13" fill="#c8664a" />
      <text x="32" y="40" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fffbf5" fontFamily="ui-sans-serif, system-ui">
        {number}
      </text>
    </svg>
  );
}
