"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface YarnStrandProps {
  /** Grosor visual de la hebra (unidades SVG). */
  width: number;
  color?: string;
  shade?: string;
  className?: string;
  animateIn?: boolean;
}

const WAVE = "M 8 30 C 48 8, 88 52, 128 30 S 208 8, 248 30 S 328 52, 392 30";

/**
 * Hebra de hilo dibujada por código: núcleo + torsión de cabos simulada con un
 * patrón de rayas diagonales (sin imágenes).
 */
export function YarnStrand({ width, color = "#c8664a", shade = "#84402f", className, animateIn = true }: YarnStrandProps) {
  const reducedMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const twistId = `twist-${uid}`;
  const plySpacing = Math.max(3, width * 0.7);

  return (
    <svg viewBox="0 0 400 60" className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern
          id={twistId}
          width={plySpacing}
          height={plySpacing}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(38)"
        >
          <rect width={plySpacing} height={plySpacing} fill={color} />
          <rect width={plySpacing * 0.42} height={plySpacing} fill={shade} opacity={0.38} />
        </pattern>
      </defs>
      <motion.path
        key={width}
        d={WAVE}
        fill="none"
        stroke={`url(#${twistId})`}
        strokeWidth={width}
        strokeLinecap="round"
        initial={animateIn && !reducedMotion ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </svg>
  );
}
