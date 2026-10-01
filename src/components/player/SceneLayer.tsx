"use client";

import { useEffect, useRef } from "react";
import { cancelFrame, frame, motion, useTransform, type MotionValue } from "framer-motion";
import type { CompiledLayer } from "@/lib/player/types";
import { AttachedToHook, TransformGroup } from "./HookActor";
import { useTrack } from "./motion-hooks";
import { STAGE_COLORS, YARN_OUTLINE, YARN_WIDTH } from "./stage-theme";
import type { StageIds } from "./StageDefs";

interface SceneLayerProps {
  layer: CompiledLayer;
  progress: MotionValue<number>;
  ids: StageIds;
}

/** Una capa de la escena: hilo, guía, mano o foco, animada según el progreso. */
export function SceneLayer({ layer, progress, ids }: SceneLayerProps) {
  const d = useTrack(progress, layer.d);
  const draw = useTrack(progress, layer.draw);
  const trim = useTrack(progress, layer.trim);
  const baseOpacity = useTrack(progress, layer.opacity);
  const x = useTrack(progress, layer.translateX);
  const y = useTrack(progress, layer.translateY);
  const active = useTrack(progress, layer.active);

  const visibleLength = useTransform([draw, trim], ([end, start]: number[]) => Math.max(0, end - start));
  const opacity = useTransform([baseOpacity, visibleLength], ([o, visible]: number[]) => {
    // Con extremos redondeados, un trazo de longitud 0 deja un punto: lo ocultamos.
    if (layer.animatesStroke && visible < 0.002) return 0;
    return o * (layer.translucent ? STAGE_COLORS.translucent : 1);
  });
  const translate = useTransform([x, y], ([tx, ty]: number[]) => (tx !== 0 || ty !== 0 ? `translate(${tx} ${ty})` : ""));

  const { base, active: activeTone } = STAGE_COLORS.yarn;
  const core = useTransform(active, [0, 1], [base.core, activeTone.core]);
  const outline = useTransform(active, [0, 1], [base.outline, activeTone.outline]);
  const sheen = useTransform(active, [0, 1], [base.sheen, activeTone.sheen]);

  const pathRef = useRef<SVGPathElement>(null);
  const strokeStyle = layer.animatesStroke ? { pathLength: visibleLength, pathOffset: trim } : {};

  let content: React.ReactNode;
  switch (layer.role) {
    case "yarn":
      content = (
        <>
          <motion.path
            d={d}
            fill="none"
            strokeWidth={YARN_WIDTH + YARN_OUTLINE}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ ...strokeStyle, stroke: outline }}
          />
          <motion.path
            ref={pathRef}
            d={d}
            fill="none"
            strokeWidth={YARN_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ ...strokeStyle, stroke: core }}
          />
          <g transform="translate(-0.8 -1)">
            <motion.path
              d={d}
              fill="none"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeOpacity={0.55}
              style={{ ...strokeStyle, stroke: sheen }}
            />
          </g>
        </>
      );
      break;
    case "guide":
      content = (
        <motion.path
          ref={pathRef}
          d={d}
          fill="none"
          stroke={STAGE_COLORS.guide}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={strokeStyle}
        />
      );
      break;
    case "hand":
      content = (
        <motion.path
          ref={pathRef}
          d={d}
          fill={STAGE_COLORS.hand.fill}
          stroke={STAGE_COLORS.hand.stroke}
          strokeWidth={1.2}
          strokeDasharray={layer.animatesStroke ? undefined : "3 4"}
          style={strokeStyle}
        />
      );
      break;
    case "focus":
      content = (
        <g className="stage-pulse">
          <motion.path
            ref={pathRef}
            d={d}
            fill="none"
            stroke={STAGE_COLORS.focus}
            strokeWidth={2.4}
            strokeLinecap="round"
            filter={`url(#${ids.glow})`}
            style={strokeStyle}
          />
        </g>
      );
      break;
  }

  const layerGroup = (
    <motion.g style={{ opacity }} data-layer={layer.id} aria-hidden="true">
      <TransformGroup transform={translate}>
        {content}
        {layer.marker ? (
          <DrawHead
            kind={layer.marker}
            pathRef={pathRef}
            draw={draw}
            d={d}
            color={layer.role === "yarn" ? STAGE_COLORS.yarn.active.core : STAGE_COLORS.guide}
          />
        ) : null}
      </TransformGroup>
    </motion.g>
  );

  return layer.attachToHook ? <AttachedToHook>{layerGroup}</AttachedToHook> : layerGroup;
}

interface DrawHeadProps {
  kind: "arrow" | "dot";
  pathRef: React.RefObject<SVGPathElement | null>;
  draw: MotionValue<number>;
  d: MotionValue<string>;
  color: string;
}

/**
 * Punta de flecha (o punto) que viaja con el extremo del trazo mientras se
 * dibuja. Se calcula tras el render de Motion de cada fotograma para medir
 * el trazado ya actualizado.
 */
function DrawHead({ kind, pathRef, draw, d, color }: DrawHeadProps) {
  const headRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const update = () => {
      const path = pathRef.current;
      const head = headRef.current;
      if (!path || !head) return;
      const amount = draw.get();
      const length = path.getTotalLength();
      if (amount <= 0.01 || length === 0) {
        head.setAttribute("opacity", "0");
        return;
      }
      const distance = amount * length;
      const point = path.getPointAtLength(distance);
      const behind = path.getPointAtLength(Math.max(0, distance - 2));
      const angle = (Math.atan2(point.y - behind.y, point.x - behind.x) * 180) / Math.PI;
      head.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
      head.setAttribute("opacity", "1");
    };
    const schedule = () => frame.postRender(update);
    schedule();
    const unsubscribeDraw = draw.on("change", schedule);
    const unsubscribeD = d.on("change", schedule);
    return () => {
      unsubscribeDraw();
      unsubscribeD();
      cancelFrame(update);
    };
  }, [pathRef, draw, d]);

  return (
    <g ref={headRef} opacity={0}>
      {kind === "arrow" ? (
        <path d="M -8 -6 L 3 0 L -8 6 Z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      ) : (
        <circle r={4.5} fill={color} />
      )}
    </g>
  );
}
