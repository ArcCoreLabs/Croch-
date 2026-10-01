"use client";

import { memo, useId, useMemo } from "react";
import type { MotionValue } from "framer-motion";
import type { CompiledStep } from "@/lib/player/types";
import { CalloutOverlay } from "./CalloutOverlay";
import { HookActor, HookMotionProvider, useHookMotion } from "./HookActor";
import { SceneLayer } from "./SceneLayer";
import { StageDefs, stageIds, type StageIds } from "./StageDefs";

interface StepStageProps {
  step: CompiledStep;
  stepNumber: number;
  techniqueName: string;
  progress: MotionValue<number>;
  /** Capa superpuesta (botón de inicio, etc.). */
  overlay?: React.ReactNode;
}

/**
 * Escenario SVG: fondo, capas detrás de la aguja, la aguja y capas delante.
 * Cada paso se monta con su propia `key`, así sus MotionValues derivados se
 * crean limpios y el orden de capas nunca se mezcla entre pasos.
 */
export const StepStage = memo(function StepStage({ step, stepNumber, techniqueName, progress, overlay }: StepStageProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = useMemo(() => stageIds(`stage${uid}`), [uid]);
  const [minX, minY, width, height] = step.scene.viewBox;
  const titleId = `${ids.background}-title`;
  const descId = `${ids.background}-desc`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[22px] bg-cocoa-900 shadow-inner ring-1 ring-black/10"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        className="absolute inset-0 size-full"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{`${techniqueName}, paso ${stepNumber}: ${step.title}`}</title>
        <desc id={descId}>{step.instruction}</desc>
        <StageDefs ids={ids} />
        <rect x={minX} y={minY} width={width} height={height} fill={`url(#${ids.background})`} />
        <rect x={minX} y={minY} width={width} height={height} fill={`url(#${ids.grid})`} />
        <StepScene key={step.id} step={step} progress={progress} ids={ids} />
      </svg>
      <CalloutOverlay key={step.id} callouts={step.scene.callouts} progress={progress} viewBox={step.scene.viewBox} />
      {overlay}
    </div>
  );
});

function StepScene({ step, progress, ids }: { step: CompiledStep; progress: MotionValue<number>; ids: StageIds }) {
  const hookMotion = useHookMotion(progress, step.scene.hook);
  return (
    <HookMotionProvider value={hookMotion}>
      <g>
        {step.scene.back.map((layer) => (
          <SceneLayer key={layer.id} layer={layer} progress={progress} ids={ids} />
        ))}
      </g>
      {step.scene.hook ? <HookActor hook={step.scene.hook} motionState={hookMotion} ids={ids} /> : null}
      <g>
        {step.scene.front.map((layer) => (
          <SceneLayer key={layer.id} layer={layer} progress={progress} ids={ids} />
        ))}
      </g>
    </HookMotionProvider>
  );
}
