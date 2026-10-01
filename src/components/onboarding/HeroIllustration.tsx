"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { buildHookGeometry, type HookProfile } from "@/lib/svg/hook-geometry";
import { HookPaintDefs, stageIds } from "@/components/player/StageDefs";

const HERO_HOOK: HookProfile = {
  headRadius: 1,
  neckRadius: 1,
  tipLength: 1.7,
  lipLength: 2.2,
  throatDepth: 0.62,
  throatLength: 2.4,
  shaftLength: 7,
  grip: { length: 3.5, halfWidth: 1.5 },
  handle: { style: "sleeve", length: 6, radius: 2.2 },
};

const STRAND =
  "M 158 150 C 176 132, 192 140, 200 124 C 208 108, 192 100, 184 112 C 176 126, 200 130, 216 114 C 232 98, 222 82, 210 92 C 198 102, 220 114, 238 100 C 250 90, 258 94, 264 94";

const WRAPS = [
  "M 66 150 C 84 128, 120 120, 150 134",
  "M 58 172 C 82 144, 132 138, 164 160",
  "M 64 196 C 90 168, 136 166, 162 188",
  "M 84 216 C 104 196, 136 196, 152 208",
  "M 92 118 C 82 150, 88 196, 116 226",
];

const SPARKLES: [number, number, number][] = [
  [300, 150, 0.2],
  [52, 70, 0.9],
  [256, 214, 1.5],
];

/** Ilustración de portada: un ovillo que se convierte en cadeneta (todo SVG). */
export function HeroIllustration() {
  const reducedMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = useMemo(() => stageIds(`hero${uid}`), [uid]);
  const hook = useMemo(() => buildHookGeometry(HERO_HOOK, { tip: [266, 94], radius: 4.6 }), []);
  const animateIn = !reducedMotion;

  return (
    <svg viewBox="0 0 360 260" className="h-auto w-full" role="img" aria-label="Un ovillo de hilo cuya hebra forma una cadeneta que termina en una aguja de croché">
      <defs>
        <HookPaintDefs ids={ids} />
      </defs>
      <path
        d="M 64 34 C 150 -12, 306 8, 334 92 C 362 176, 292 254, 182 250 C 72 246, 6 196, 18 122 C 24 82, 40 50, 64 34 Z"
        className="fill-surface-muted"
      />
      <g>
        <circle cx="110" cy="172" r="60" fill="#c8664a" />
        {WRAPS.map((d, index) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke="#f1c3ae"
            strokeWidth={3}
            strokeLinecap="round"
            initial={animateIn ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.1 + index * 0.08, ease: "easeOut" }}
          />
        ))}
        <circle cx="110" cy="172" r="60" fill="none" stroke="#84402f" strokeWidth={3} />
      </g>
      <motion.path
        d={STRAND}
        fill="none"
        stroke="#84402f"
        strokeWidth={8.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animateIn ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, delay: 0.5, ease: "easeInOut" }}
      />
      <motion.path
        d={STRAND}
        fill="none"
        stroke="#db8466"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animateIn ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, delay: 0.5, ease: "easeInOut" }}
      />
      <motion.g
        initial={animateIn ? { opacity: 0, rotate: -6 } : false}
        animate={animateIn ? { opacity: 1, rotate: [-6, 3, -2, 0] } : { opacity: 1 }}
        transition={{ duration: 1.4, delay: 2.4, ease: "easeOut" }}
        style={{ transformBox: "view-box", originX: "266px", originY: "94px" }}
      >
        <g transform="rotate(-40 266 94)">
          <path d={hook.metal} fill={`url(#${ids.metal("aluminio")})`} stroke="#3f4752" strokeWidth={0.8} />
          <path d={hook.sleeve} fill={`url(#${ids.sleeve})`} stroke="#7a3826" strokeWidth={0.8} />
          <path d={hook.shine} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      </motion.g>
      {SPARKLES.map(([x, y, delay]) => (
        <motion.path
          key={`${x}-${y}`}
          d={`M ${x} ${y - 9} Q ${x} ${y}, ${x + 9} ${y} Q ${x} ${y}, ${x} ${y + 9} Q ${x} ${y}, ${x - 9} ${y} Q ${x} ${y}, ${x} ${y - 9} Z`}
          fill="#e2a63b"
          initial={animateIn ? { scale: 0, opacity: 0 } : false}
          animate={animateIn ? { scale: [0, 1, 0.8, 1], opacity: 1 } : { opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.2 + delay }}
        />
      ))}
    </svg>
  );
}
