"use client";

import { motion, type MotionValue } from "framer-motion";
import type { CompiledCallout } from "@/lib/player/types";
import { cx } from "@/lib/cx";
import { useTrack } from "./motion-hooks";

const GAP = "10px";

function placementTransform({ placement, align }: CompiledCallout): string {
  const alignX = align === "start" ? "-14px" : align === "end" ? "calc(-100% + 14px)" : "-50%";
  switch (placement) {
    case "top":
      return `translate(${alignX}, calc(-100% - ${GAP}))`;
    case "bottom":
      return `translate(${alignX}, ${GAP})`;
    case "left":
      return `translate(calc(-100% - ${GAP}), -50%)`;
    case "right":
      return `translate(${GAP}, -50%)`;
  }
}

const TONE_CLASSES: Record<CompiledCallout["tone"], string> = {
  info: "bg-cream-50/95 text-cocoa-800",
  success: "bg-sage-200 text-sage-800",
  warning: "bg-honey-200 text-cocoa-800",
};

function Callout({
  callout,
  progress,
  viewBox,
}: {
  callout: CompiledCallout;
  progress: MotionValue<number>;
  viewBox: [number, number, number, number];
}) {
  const opacity = useTrack(progress, callout.opacity);
  const [minX, minY, width, height] = viewBox;
  const left = ((callout.at[0] - minX) / width) * 100;
  const top = ((callout.at[1] - minY) / height) * 100;

  return (
    <div className="absolute" style={{ left: `${left}%`, top: `${top}%`, transform: placementTransform(callout) }}>
      <motion.p
        style={{ opacity }}
        className={cx(
          "w-max max-w-[9.5rem] rounded-xl px-2 py-1 text-[10.5px] font-bold leading-tight shadow-md shadow-black/30 sm:max-w-[12rem] sm:px-2.5 sm:text-xs",
          TONE_CLASSES[callout.tone],
        )}
      >
        {callout.text}
      </motion.p>
    </div>
  );
}

/** Etiquetas HTML sobre la escena: texto nítido y legible a cualquier tamaño. */
export function CalloutOverlay({
  callouts,
  progress,
  viewBox,
}: {
  callouts: CompiledCallout[];
  progress: MotionValue<number>;
  viewBox: [number, number, number, number];
}) {
  if (callouts.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {callouts.map((callout) => (
        <Callout key={callout.id} callout={callout} progress={progress} viewBox={viewBox} />
      ))}
    </div>
  );
}
