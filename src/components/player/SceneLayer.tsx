"use client";

import { useEffect, useId, useRef } from "react";
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

  const pathRef = useRef<SVGPathElement>(null);
  const strokeStyle: YarnPaths["strokeStyle"] = layer.animatesStroke ? { pathLength: visibleLength, pathOffset: trim } : {};

  let content: React.ReactNode;
  switch (layer.role) {
    case "yarn":
      content = (
        <YarnStroke
          d={d}
          strokeStyle={strokeStyle}
          active={active}
          gradient={layer.gradient}
          progress={progress}
          pathRef={pathRef}
        />
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

/**
 * Colores del hilo según el tono (0 = base azul, 1 = activo amarillo).
 * Azul y amarillo mezclados en RGB dan un gris apagado: el cambio de tono pasa
 * por un blanco cálido, que se lee como un destello de "puntada terminada".
 */
function useYarnColors(tone: MotionValue<number>) {
  const { base, active, glow } = STAGE_COLORS.yarn;
  return {
    core: useTransform<number, string>(tone, [0, 0.5, 1], [base.core, glow.core, active.core]),
    outline: useTransform<number, string>(tone, [0, 0.5, 1], [base.outline, glow.outline, active.outline]),
    sheen: useTransform<number, string>(tone, [0, 0.5, 1], [base.sheen, glow.sheen, active.sheen]),
  };
}

type StrokePaint = MotionValue<string> | string;

interface YarnPaths {
  d: MotionValue<string>;
  strokeStyle: { pathLength?: MotionValue<number>; pathOffset?: MotionValue<number> };
  pathRef: React.RefObject<SVGPathElement | null>;
}

/** Hilo = contorno + núcleo + brillo, con la pintura que se le indique. */
function YarnPaths({ d, strokeStyle, pathRef, outline, core, sheen }: YarnPaths & { outline: StrokePaint; core: StrokePaint; sheen: StrokePaint }) {
  return (
    <>
      {/* Contorno con extremos planos: así los tramos que se empalman (la hebra que
          pasa de detrás a delante de la aguja) no dejan una "costura" oscura. */}
      <motion.path
        d={d}
        fill="none"
        strokeWidth={YARN_WIDTH + YARN_OUTLINE}
        strokeLinecap="butt"
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
}

interface YarnStrokeProps extends YarnPaths {
  active: MotionValue<number>;
  gradient: CompiledLayer["gradient"];
  progress: MotionValue<number>;
}

function YarnStroke({ gradient, ...props }: YarnStrokeProps) {
  return gradient ? <GradientYarn gradient={gradient} {...props} /> : <SolidYarn {...props} />;
}

function SolidYarn({ active, d, strokeStyle, pathRef }: Omit<YarnStrokeProps, "gradient" | "progress">) {
  const colors = useYarnColors(active);
  return <YarnPaths d={d} strokeStyle={strokeStyle} pathRef={pathRef} {...colors} />;
}

/**
 * Tramo con degradado de tono (p. ej. el "cuello" donde la hebra de trabajo sale
 * de la labor): el color cambia suave a lo largo del hilo, sin un borde que
 * parezca un corte. El degradado sigue a los extremos del tramo mientras se mueve.
 */
function GradientYarn({
  gradient,
  active,
  progress,
  d,
  strokeStyle,
  pathRef,
}: Omit<YarnStrokeProps, "gradient"> & { gradient: NonNullable<CompiledLayer["gradient"]> }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const startTone = useTrack(progress, gradient.from);
  const x1 = useTrack(progress, gradient.x1);
  const y1 = useTrack(progress, gradient.y1);
  const x2 = useTrack(progress, gradient.x2);
  const y2 = useTrack(progress, gradient.y2);
  const start = useYarnColors(startTone);
  const end = useYarnColors(active);

  const parts = ["outline", "core", "sheen"] as const;
  return (
    <>
      <defs>
        {parts.map((part) => (
          <motion.linearGradient key={part} id={`${uid}-${part}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
            <motion.stop offset="0" stopColor={start[part]} />
            <motion.stop offset="1" stopColor={end[part]} />
          </motion.linearGradient>
        ))}
      </defs>
      <YarnPaths
        d={d}
        strokeStyle={strokeStyle}
        pathRef={pathRef}
        outline={`url(#${uid}-outline)`}
        core={`url(#${uid}-core)`}
        sheen={`url(#${uid}-sheen)`}
      />
    </>
  );
}
