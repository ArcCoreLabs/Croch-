"use client";

import { memo, useId, useMemo, useRef } from "react";
import type { MotionValue } from "framer-motion";
import type { CompiledStep } from "@/lib/player/types";
import { CalloutOverlay } from "./CalloutOverlay";
import { HookActor, HookMotionProvider, useHookMotion } from "./HookActor";
import { SceneLayer } from "./SceneLayer";
import { StageDefs, stageIds, type StageIds } from "./StageDefs";
import { YarnCanvas } from "./YarnCanvas";

interface StepStageProps {
  step: CompiledStep;
  stepNumber: number;
  techniqueName: string;
  progress: MotionValue<number>;
  /** Capa superpuesta (botón de inicio, etc.). */
  overlay?: React.ReactNode;
}

/**
 * Escenario por capas:
 * 1. SVG de fondo: fondo, sombra del hilo, capas de detrás y la aguja.
 * 2. Lienzo WebGL: el hilo en 3D (tapa o deja ver la aguja según su profundidad).
 * 3. SVG de encima: guías y anillos de atención.
 * 4. Etiquetas HTML.
 * Las capas de cada paso se montan con su propia `key`; el lienzo es único.
 */
export const StepStage = memo(function StepStage({ step, stepNumber, techniqueName, progress, overlay }: StepStageProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = useMemo(() => stageIds(`stage${uid}`), [uid]);
  const shadowRef = useRef<SVGPathElement>(null);
  const [minX, minY, width, height] = step.scene.viewBox;
  const viewBox = `${minX} ${minY} ${width} ${height}`;
  const titleId = `${ids.background}-title`;
  const descId = `${ids.background}-desc`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[22px] bg-cocoa-900 shadow-inner ring-1 ring-black/10"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <svg viewBox={viewBox} className="absolute inset-0 size-full" role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>{`${techniqueName}, paso ${stepNumber}: ${step.title}`}</title>
        <desc id={descId}>{step.instruction}</desc>
        <StageDefs ids={ids} />
        <rect x={minX} y={minY} width={width} height={height} fill={`url(#${ids.background})`} />
        <rect x={minX} y={minY} width={width} height={height} fill={`url(#${ids.grid})`} />
        <path
          ref={shadowRef}
          fill="none"
          stroke="#000"
          strokeOpacity={0.34}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(2.4 3)"
          filter={`url(#${ids.yarnShadow})`}
        />
        <BackScene key={step.id} step={step} progress={progress} ids={ids} />
      </svg>
      <YarnCanvas scene={step.scene} progress={progress} shadowRef={shadowRef} />
      <svg viewBox={viewBox} className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        <FrontScene key={step.id} step={step} progress={progress} ids={ids} />
      </svg>
      <CalloutOverlay key={step.id} callouts={step.scene.callouts} progress={progress} viewBox={step.scene.viewBox} />
      {overlay}
    </div>
  );
});

interface SceneProps {
  step: CompiledStep;
  progress: MotionValue<number>;
  ids: StageIds;
}

function BackScene({ step, progress, ids }: SceneProps) {
  const hookMotion = useHookMotion(progress, step.scene.hook);
  return (
    <HookMotionProvider value={hookMotion}>
      {step.scene.back.map((layer) => (
        <SceneLayer key={layer.id} layer={layer} progress={progress} ids={ids} />
      ))}
      {step.scene.hook ? <HookActor hook={step.scene.hook} motionState={hookMotion} ids={ids} /> : null}
    </HookMotionProvider>
  );
}

function FrontScene({ step, progress, ids }: SceneProps) {
  const hookMotion = useHookMotion(progress, step.scene.hook);
  return (
    <HookMotionProvider value={hookMotion}>
      {step.scene.front.map((layer) => (
        <SceneLayer key={layer.id} layer={layer} progress={progress} ids={ids} />
      ))}
    </HookMotionProvider>
  );
}
