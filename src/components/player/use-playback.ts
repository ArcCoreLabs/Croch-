"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { animate, useMotionValue, type AnimationPlaybackControls } from "framer-motion";
import type { CompiledStep } from "@/lib/player/types";
import { createPlaybackState, playbackReducer, type PlaybackSpeed } from "./playback";

const AUTO_ADVANCE_DELAY_MS = 700;

interface UsePlaybackOptions {
  initialStep?: number;
  reducedMotion: boolean;
}

/**
 * Orquesta la reproducción: un MotionValue de progreso (0–1) animado con
 * `animate()` de Framer Motion + el reducer de estado de la interfaz.
 */
export function usePlayback(steps: CompiledStep[], { initialStep = 0, reducedMotion }: UsePlaybackOptions) {
  // Arrancamos mostrando el final del primer paso como "póster".
  const progress = useMotionValue(1);
  const [state, dispatch] = useReducer(playbackReducer, steps.length, (count) =>
    createPlaybackState(count, initialStep),
  );
  const animationRef = useRef<AnimationPlaybackControls | null>(null);

  const stopAnimation = useCallback(() => {
    animationRef.current?.stop();
    animationRef.current = null;
  }, []);

  // Anima el progreso mientras el estado sea "playing".
  useEffect(() => {
    if (state.status !== "playing") return;
    const step = steps[state.index];
    if (!step) return;

    if (progress.get() >= 0.999) progress.set(0);
    const from = progress.get();
    const animation = animate(progress, 1, {
      duration: ((1 - from) * step.durationMs) / 1000 / state.speed,
      ease: "linear",
      onComplete: () => dispatch({ type: "complete" }),
    });
    animationRef.current = animation;

    return () => {
      animation.stop();
      if (animationRef.current === animation) animationRef.current = null;
    };
  }, [state.status, state.index, state.speed, state.playToken, steps, progress]);

  const goTo = useCallback(
    (index: number, autoplay: boolean = !reducedMotion) => {
      stopAnimation();
      progress.set(autoplay ? 0 : reducedMotion ? 1 : 0);
      dispatch({ type: "goto", index, autoplay, reducedMotion });
    },
    [progress, reducedMotion, stopAnimation],
  );

  // Avance automático al terminar un paso (si está activado).
  useEffect(() => {
    if (state.status !== "ended" || !state.autoAdvance || state.index >= steps.length - 1) return;
    const timer = window.setTimeout(() => goTo(state.index + 1, true), AUTO_ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.status, state.autoAdvance, state.index, steps.length, goTo]);

  const play = useCallback(() => dispatch({ type: "play" }), []);

  const pause = useCallback(() => {
    stopAnimation();
    dispatch({ type: "pause" });
  }, [stopAnimation]);

  const seek = useCallback(
    (value: number) => {
      stopAnimation();
      const clamped = Math.min(1, Math.max(0, value));
      progress.set(clamped);
      dispatch({ type: "seek", atEnd: clamped >= 1 });
    },
    [progress, stopAnimation],
  );

  const setSpeed = useCallback((speed: PlaybackSpeed) => dispatch({ type: "setSpeed", speed }), []);
  const setAutoAdvance = useCallback((value: boolean) => dispatch({ type: "setAutoAdvance", value }), []);

  const isPlaying = state.status === "playing";

  return {
    state,
    step: steps[state.index],
    progress,
    isPlaying,
    isFirst: state.index === 0,
    isLast: state.index === steps.length - 1,
    play,
    pause,
    toggle: isPlaying ? pause : play,
    seek,
    goTo,
    next: () => goTo(state.index + 1),
    prev: () => goTo(state.index - 1),
    restart: () => goTo(0, true),
    setSpeed,
    setAutoAdvance,
  };
}

export type PlaybackController = ReturnType<typeof usePlayback>;
