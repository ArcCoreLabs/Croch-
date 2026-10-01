"use client";

import { createContext, useContext, useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import type { CompiledHook, Track } from "@/lib/player/types";
import { HookShape } from "./HookShape";
import { useInitialValue, useSvgAttribute, useTrack } from "./motion-hooks";
import type { StageIds } from "./StageDefs";

const ZERO: Track<number> = { at: [0, 1], values: [0, 0], ease: ["linear"] };
const ONE: Track<number> = { at: [0, 1], values: [1, 1], ease: ["linear"] };

export interface HookMotion {
  /** Atributo SVG `transform` compuesto (traslación + rotación sobre el pivote). */
  transform: MotionValue<string>;
  opacity: MotionValue<number>;
}

/** Calcula la pose de la aguja a partir del progreso del paso. */
export function useHookMotion(progress: MotionValue<number>, hook: CompiledHook | null): HookMotion {
  const x = useTrack(progress, hook?.translateX ?? ZERO);
  const y = useTrack(progress, hook?.translateY ?? ZERO);
  const rotate = useTrack(progress, hook?.rotate ?? ZERO);
  const opacity = useTrack(progress, hook?.opacity ?? ONE);
  const [px, py] = hook?.pivot ?? [0, 0];
  const transform = useTransform([x, y, rotate], ([tx, ty, r]: number[]) => {
    const translate = tx !== 0 || ty !== 0 ? `translate(${tx} ${ty})` : "";
    const rotation = r !== 0 ? ` rotate(${r} ${px} ${py})` : "";
    return `${translate}${rotation}`.trim();
  });
  return { transform, opacity };
}

const HookMotionContext = createContext<HookMotion | null>(null);
export const HookMotionProvider = HookMotionContext.Provider;

/** Grupo SVG que sigue a la aguja (para capas con `attach: "hook"`). */
export function AttachedToHook({ children }: { children: React.ReactNode }) {
  const motionState = useContext(HookMotionContext);
  if (!motionState) return <>{children}</>;
  return <TransformGroup transform={motionState.transform}>{children}</TransformGroup>;
}

export function TransformGroup({ transform, children }: { transform: MotionValue<string>; children: React.ReactNode }) {
  const ref = useRef<SVGGElement>(null);
  const initial = useInitialValue(transform);
  useSvgAttribute(ref, "transform", transform);
  return (
    <g ref={ref} transform={initial || undefined}>
      {children}
    </g>
  );
}

interface HookActorProps {
  hook: CompiledHook;
  motionState: HookMotion;
  ids: StageIds;
}

export function HookActor({ hook, motionState, ids }: HookActorProps) {
  return (
    <motion.g style={{ opacity: motionState.opacity }} aria-hidden="true">
      <TransformGroup transform={motionState.transform}>
        <HookShape shape={hook.shape} ids={ids} translucent />
      </TransformGroup>
    </motion.g>
  );
}
