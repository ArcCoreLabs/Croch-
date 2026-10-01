"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import type { GlossaryTermView } from "@/lib/content/view-models";
import { cx } from "@/lib/cx";

type System = "es" | "us" | "uk";

const SYSTEMS: { value: System; label: string; short: string }[] = [
  { value: "es", label: "Español", short: "ES" },
  { value: "us", label: "Inglés (EE. UU.)", short: "US" },
  { value: "uk", label: "Inglés (Reino Unido)", short: "UK" },
];

/** Glosario con equivalencias: los patrones en inglés usan dos sistemas distintos. */
export function GlossaryExplorer({ terms }: { terms: GlossaryTermView[] }) {
  const groupName = useId();
  const [system, setSystem] = useState<System>("es");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <fieldset className="inline-flex self-start rounded-full bg-surface p-1 ring-1 ring-line">
          <legend className="sr-only">Sistema de abreviaturas</legend>
          {SYSTEMS.map((option) => {
            const checked = system === option.value;
            return (
              <label
                key={option.value}
                className={cx(
                  "relative cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-terracotta-400",
                  checked ? "text-canvas" : "text-ink-soft hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  name={`${groupName}-sistema`}
                  value={option.value}
                  checked={checked}
                  onChange={() => setSystem(option.value)}
                  className="sr-only"
                />
                {checked ? (
                  <motion.span
                    layoutId={`${groupName}-pill`}
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                ) : null}
                <span className="relative">
                  <span className="sm:hidden" aria-hidden="true">
                    {option.short}
                  </span>
                  <span className="sr-only sm:not-sr-only">{option.label}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <p className="flex items-start gap-2 text-sm text-ink-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-honey-600" aria-hidden="true" />
          <span>
            Ojo: <strong className="text-ink">«dc»</strong> es punto alto en EE. UU. y punto bajo en Reino Unido.
          </span>
        </p>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {terms.map((term) => {
          const abbr = term.abbr[system] ?? term.abbr.es;
          const name = system === "es" ? term.term : system === "us" ? term.us : term.uk;
          return (
            <li key={term.id} className="flex gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-line">
              <span className="grid h-12 min-w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-terracotta-100 px-2 font-mono text-base font-extrabold text-terracotta-700 dark:bg-terracotta-500/20 dark:text-terracotta-200">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`${term.id}-${system}`}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {abbr}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-ink">{name}</span>
                {system !== "es" ? <span className="block text-xs font-semibold text-ink-soft">{term.term}</span> : null}
                <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{term.definition}</span>
                {system === "es" && term.aliases.length > 0 ? (
                  <span className="mt-1 block text-xs text-ink-soft">
                    También: <em>{term.aliases.join(", ")}</em>
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
