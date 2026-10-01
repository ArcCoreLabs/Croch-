"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import type { HookGuideData } from "@/lib/content/view-models";
import type { HookPartId } from "@/lib/svg/hook-geometry";
import { cx } from "@/lib/cx";
import { HookFigure } from "@/components/illustrations/HookFigure";

const MATERIAL_LABEL = { aluminio: "Aluminio", acero: "Acero", bambu: "Bambú" } as const;

/** Diccionario visual: anatomía interactiva y tipos de aguja generados por código. */
export function HookAnatomy({ guide }: { guide: HookGuideData }) {
  const groupName = useId();
  const [typeId, setTypeId] = useState(guide.types[0].id);
  const [partId, setPartId] = useState<HookPartId>("garganta");

  const type = guide.types.find((t) => t.id === typeId) ?? guide.types[0];
  const part = guide.parts.find((p) => p.id === partId) ?? guide.parts[0];
  const span = type.geometry.parts[partId];

  const [minX, minY, width, height] = guide.viewBox;
  const labelLeft = ((span.anchor[0] - minX) / width) * 100;
  const labelTop = ((span.anchor[1] - minY) / height) * 100;

  // Lupa sobre la cabeza: punta + garganta + inicio del cuerpo.
  const headEnd = type.geometry.parts.cuerpo.x0;
  const zoomViewBox: [number, number, number, number] = [minX + 8, 36, headEnd - minX + 6, 48];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
      <div className="space-y-4">
        <fieldset>
          <legend className="sr-only">Tipo de aguja</legend>
          <div className="flex flex-wrap gap-2">
            {guide.types.map((option) => {
              const checked = option.id === typeId;
              return (
                <label
                  key={option.id}
                  className={cx(
                    "cursor-pointer rounded-full px-3.5 py-2 text-sm font-bold transition active:scale-95 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-terracotta-400",
                    checked ? "bg-ink text-canvas shadow-sm" : "bg-surface text-ink-soft ring-1 ring-line hover:text-ink",
                  )}
                >
                  <input
                    type="radio"
                    name={`${groupName}-tipo`}
                    value={option.id}
                    checked={checked}
                    onChange={() => setTypeId(option.id)}
                    className="sr-only"
                  />
                  {option.name}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="relative rounded-3xl bg-surface p-3 pt-10 shadow-soft ring-1 ring-line sm:p-5 sm:pt-12">
          <div className="relative">
            <HookFigure
              geometry={type.geometry}
              material={type.material}
              viewBox={guide.viewBox}
              highlight={partId}
              className="h-auto w-full overflow-visible"
              title={`Aguja ${type.name}: ${part.name} resaltada`}
            />
            <motion.div
              className="pointer-events-none absolute"
              initial={false}
              animate={{ left: `${labelLeft}%`, top: `${labelTop}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              aria-hidden="true"
            >
              <div className="-translate-x-1/2 -translate-y-full pb-1">
                <span className="block whitespace-nowrap rounded-full bg-honey-300 px-2.5 py-1 text-xs font-extrabold text-cocoa-800 shadow">
                  {part.name}
                </span>
                <span className="mx-auto block h-3 w-0.5 bg-honey-500" />
              </div>
            </motion.div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-muted p-2 pr-4">
            <div className="w-1/2 max-w-56 shrink-0 overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
              <HookFigure
                geometry={type.geometry}
                material={type.material}
                viewBox={zoomViewBox}
                highlight={partId === "punta" || partId === "garganta" ? partId : null}
                className="h-auto w-full"
              />
            </div>
            <p className="flex items-start gap-1.5 text-xs leading-snug text-ink-soft sm:text-sm">
              <Search className="mt-0.5 size-4 shrink-0 text-terracotta-500" aria-hidden="true" />
              <span>
                <strong className="text-ink">Lupa:</strong> la garganta es el corte que atrapa la hebra. Fíjate siempre
                hacia dónde mira.
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ul className="grid gap-2" aria-label="Partes de la aguja">
          {guide.parts.map((item, index) => {
            const isActive = item.id === partId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setPartId(item.id)}
                  aria-pressed={isActive}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                    isActive ? "bg-honey-100 ring-2 ring-honey-400 dark:bg-honey-500/15" : "bg-surface ring-1 ring-line hover:bg-surface-muted",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-bold",
                      isActive ? "bg-honey-400 text-cocoa-800" : "bg-surface-muted text-ink-soft",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">{item.name}</span>
                    <span className="block text-sm text-ink-soft">{item.role}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${partId}-${typeId}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-line"
            aria-live="polite"
          >
            <p className="text-sm leading-relaxed text-ink">{part.description}</p>
            <div className="border-t border-line pt-3">
              <p className="flex flex-wrap items-baseline gap-x-2 font-display text-lg font-semibold text-ink">
                Aguja {type.name.toLowerCase()}
                <span className="font-sans text-xs font-bold text-ink-soft">
                  {MATERIAL_LABEL[type.material]} · {type.sizesMm[0]}–{type.sizesMm[1]} mm
                </span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">{type.description}</p>
              <p className="mt-2 rounded-xl bg-sage-100 px-3 py-2 text-sm font-semibold text-sage-800 dark:bg-sage-500/15 dark:text-sage-100">
                Ideal para: {type.bestFor}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
