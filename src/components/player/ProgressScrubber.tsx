"use client";

import { useState, type CSSProperties } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

const RESOLUTION = 1000;

interface ProgressScrubberProps {
  progress: MotionValue<number>;
  onSeek: (value: number) => void;
  stepLabel: string;
}

/**
 * Slider 0–100 % que controla manualmente el avance de la hebra.
 * Es el único componente que re-renderiza durante la reproducción, y lo
 * hace aislado del resto del reproductor.
 */
export function ProgressScrubber({ progress, onSeek, stepLabel }: ProgressScrubberProps) {
  const [value, setValue] = useState(() => Math.round(progress.get() * RESOLUTION));
  useMotionValueEvent(progress, "change", (latest) => setValue(Math.round(latest * RESOLUTION)));

  const percent = Math.round((value / RESOLUTION) * 100);

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={RESOLUTION}
        step={1}
        value={value}
        onChange={(event) => onSeek(Number(event.currentTarget.value) / RESOLUTION)}
        aria-label={`Avance de la hebra en ${stepLabel}`}
        aria-valuetext={`${percent} %`}
        className="scrubber min-w-0 flex-1"
        style={{ "--fill": `${(value / RESOLUTION) * 100}%` } as CSSProperties}
      />
      <output className="w-11 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-ink-soft" aria-hidden="true">
        {percent}%
      </output>
    </div>
  );
}
