"use client";

import { useLayoutEffect, useMemo, useState, type RefObject } from "react";
import {
  anticipate,
  backOut,
  circOut,
  easeIn,
  easeInOut,
  easeOut,
  useTransform,
  type EasingFunction,
  type MotionValue,
} from "framer-motion";
import type { EasingResolver } from "@/lib/player/track";
import type { EaseName, Track } from "@/lib/player/types";

const EASING_FUNCTIONS: Record<EaseName, EasingFunction> = {
  linear: (v) => v,
  easeIn,
  easeOut,
  easeInOut,
  backOut,
  anticipate,
  circOut,
};

/** Funciones de easing por nombre (las mismas que usan los MotionValues). */
export const easeByName: EasingResolver = (name) => EASING_FUNCTIONS[name];

/** Convierte una pista compilada en un MotionValue derivado del progreso del paso. */
export function useTrack<T>(progress: MotionValue<number>, track: Track<T>): MotionValue<T> {
  const ease = useMemo(() => track.ease.map((name) => EASING_FUNCTIONS[name]), [track.ease]);
  return useTransform(progress, track.at, track.values, { ease });
}

/**
 * Escribe un MotionValue de texto directamente en un atributo SVG.
 *
 * Motion convierte la prop `transform` en CSS, que no admite la sintaxis SVG
 * `rotate(ángulo cx cy)`. Para rotar alrededor de un pivote exacto escribimos
 * el atributo nativo, sin re-renderizar React en cada fotograma.
 */
export function useSvgAttribute(
  ref: RefObject<SVGElement | null>,
  name: string,
  value: MotionValue<string>,
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const apply = (latest: string) => {
      if (latest) element.setAttribute(name, latest);
      else element.removeAttribute(name);
    };
    apply(value.get());
    return value.on("change", apply);
  }, [ref, name, value]);
}

/** Valor inicial estable para renderizar en servidor el mismo atributo que luego anima el cliente. */
export function useInitialValue<T>(value: MotionValue<T>): T {
  const [initial] = useState(() => value.get());
  return initial;
}
