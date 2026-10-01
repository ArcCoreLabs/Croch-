"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { HookGeometry, HookMaterial, HookPartId } from "@/lib/svg/hook-geometry";
import { HookPaintDefs, stageIds } from "@/components/player/StageDefs";
import { STAGE_COLORS } from "@/components/player/stage-theme";

interface HookFigureProps {
  geometry: HookGeometry;
  material: HookMaterial;
  viewBox: [number, number, number, number];
  highlight: HookPartId | null;
  className?: string;
  title?: string;
}

/**
 * Aguja generada por código con una parte resaltada. Al cambiar de tipo de
 * aguja, los trazados se interpolan (todos comparten estructura).
 */
export function HookFigure({ geometry, material, viewBox, highlight, className, title }: HookFigureProps) {
  const reducedMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = useMemo(() => stageIds(`hook${uid}`), [uid]);
  const clipId = `${ids.background}-clip`;
  const transition = { duration: reducedMotion ? 0 : 0.55, ease: "easeInOut" as const };

  const [minX, minY, , height] = viewBox;
  const part = highlight ? geometry.parts[highlight] : null;
  const band = part
    ? `M ${part.x0} ${minY} H ${part.x1} V ${minY + height} H ${part.x0} Z`
    : `M ${minX} ${minY} H ${minX} V ${minY + height} H ${minX} Z`;

  return (
    <svg viewBox={viewBox.join(" ")} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <HookPaintDefs ids={ids} />
        <clipPath id={clipId}>
          <motion.path initial={false} animate={{ d: geometry.metal }} transition={transition} />
          <motion.path initial={false} animate={{ d: geometry.sleeve }} transition={transition} />
        </clipPath>
      </defs>
      <g filter={`url(#${ids.shadow})`}>
        <motion.path
          initial={false}
          animate={{ d: geometry.metal }}
          transition={transition}
          fill={`url(#${ids.metal(material)})`}
          stroke={STAGE_COLORS.metalOutline}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <motion.path
          initial={false}
          animate={{ d: geometry.sleeve, opacity: geometry.sleeveVisible ? 1 : 0 }}
          transition={transition}
          fill={`url(#${ids.sleeve})`}
          stroke="#7a3826"
          strokeWidth={0.8}
        />
        <motion.path
          initial={false}
          animate={{ d: geometry.shine }}
          transition={transition}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.7}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </g>
      <motion.path
        initial={false}
        animate={{ d: band, opacity: part ? 0.62 : 0 }}
        transition={transition}
        clipPath={`url(#${clipId})`}
        fill="#ffd43b"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
