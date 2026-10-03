"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cancelFrame, frame, type MotionValue } from "framer-motion";
import { sampleNumber, sampleNumbers } from "@/lib/player/track";
import type { CompiledHook, CompiledScene, CompiledStrand } from "@/lib/player/types";
import { buildStrandCurve, curvePath, sampleStrand, type StrandCurve } from "@/lib/yarn/curve";
import { YarnRenderer, type HookPoseGL, type TubeGeometry } from "@/lib/yarn/gl-renderer";
import { buildHookOccluder } from "@/lib/yarn/hook-occluder";
import { hexToUnitRgb, YARN, YARN_COLORS } from "@/lib/yarn/style";
import { toneAt, toneSpanAt } from "@/lib/yarn/tone";
import { buildTube } from "@/lib/yarn/tube";
import { easeByName } from "./motion-hooks";

interface YarnCanvasProps {
  scene: CompiledScene;
  progress: MotionValue<number>;
  /** Trazo SVG (debajo de la aguja) donde se pinta la sombra del hilo sobre el fondo. */
  shadowRef: React.RefObject<SVGPathElement | null>;
}

interface StrandFrame {
  curve: StrandCurve;
  tube: TubeGeometry;
}

const PALETTE = {
  base: hexToUnitRgb(YARN_COLORS.base),
  active: hexToUnitRgb(YARN_COLORS.active),
};

/** Puntos del hilo en este instante → curva + malla de tubo. */
function strandFrame(strand: CompiledStrand, progress: number, cache: Map<string, Float32Array>): StrandFrame {
  const points = sampleNumbers(strand.points, progress, easeByName);
  const spans = strand.tone.map((span) => toneSpanAt(span, progress, easeByName));
  const curve = buildStrandCurve(points);
  const samples = sampleStrand(curve, YARN.perSegment);
  const tube = buildTube(
    { samples, radius: YARN.radius, spacing: strand.spacing, tone: (u) => toneAt(spans, u), capStart: strand.freeStart },
    cache.get(strand.id),
  );
  cache.set(strand.id, tube.vertices);
  return { curve, tube };
}

function hookPose(hook: CompiledHook | null, progress: number): HookPoseGL | null {
  if (!hook || sampleNumber(hook.opacity, progress, easeByName) < 0.05) return null;
  return {
    tip: hook.tip,
    pivot: hook.pivot,
    tx: sampleNumber(hook.translateX, progress, easeByName),
    ty: sampleNumber(hook.translateY, progress, easeByName),
    rot: sampleNumber(hook.rotate, progress, easeByName),
  };
}

/**
 * Lienzo WebGL con el hilo en 3D, encima de la aguja (SVG). La aguja existe
 * también como volumen invisible para tapar lo que pasa por detrás. Un mismo
 * lienzo sirve a todos los pasos: cambiar de paso solo cambia los datos.
 */
export function YarnCanvas({ scene, progress, shadowRef }: YarnCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<YarnRenderer | null>(null);
  const sceneRef = useRef(scene);
  const drawRef = useRef<() => void>(() => {});
  const [fallback, setFallback] = useState(false);
  const fallbackPathRef = useRef<SVGPathElement>(null);
  const fallbackOutlineRef = useRef<SVGPathElement>(null);
  const [minX, minY, width, height] = scene.viewBox;

  // Dibujo de un fotograma (lee siempre la escena y el progreso actuales).
  useLayoutEffect(() => {
    const cache = new Map<string, Float32Array>();
    let occluderKey = "";
    drawRef.current = () => {
      const current = sceneRef.current;
      const p = progress.get();
      const frames = current.strands.map((strand) => strandFrame(strand, p, cache));
      const shadow = frames.map((f) => curvePath(f.curve, 0, f.curve.count - 1)).join("");
      shadowRef.current?.setAttribute("d", shadow);
      const renderer = rendererRef.current;
      if (renderer) {
        const hook = current.hook;
        const key = hook ? `${hook.radius}:${JSON.stringify(hook.profile)}` : "";
        if (key !== occluderKey) {
          renderer.setOccluder(hook ? buildHookOccluder(hook.profile, hook.radius) : null);
          occluderKey = key;
        }
        renderer.setViewBox(current.viewBox);
        renderer.render(
          frames.map((f) => f.tube),
          hookPose(hook, p),
        );
      } else {
        fallbackPathRef.current?.setAttribute("d", shadow);
        fallbackOutlineRef.current?.setAttribute("d", shadow);
      }
    };
  }, [progress, shadowRef]);

  // Crear el renderizador (o pasar al respaldo SVG) y seguir el tamaño del escenario.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: YarnRenderer | null = null;
    try {
      renderer = YarnRenderer.isSupported()
        ? new YarnRenderer(canvas, PALETTE, {
            outlineWidth: YARN.outline,
            pitch: YARN.pitch,
            plies: YARN.plies,
            ghostAlpha: YARN.ghostAlpha,
            hookShadow: YARN.hookShadow,
          })
        : null;
    } catch (error) {
      console.warn("[YarnCanvas] WebGL no disponible, uso el respaldo SVG:", error);
      renderer = null;
    }
    if (!renderer) {
      setFallback(true);
      return;
    }
    rendererRef.current = renderer;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (rect.width === 0 || rect.height === 0) return;
      renderer.setSize(Math.round(rect.width * dpr), Math.round(rect.height * dpr), dpr < 1.5 ? 2 : 1);
      drawRef.current();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const onLost = (event: Event) => {
      event.preventDefault();
      rendererRef.current = null;
      setFallback(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => {
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      rendererRef.current = null;
      renderer.dispose();
    };
  }, []);

  // Cada cambio de paso redibuja ya (sin esperar al siguiente cambio de progreso).
  useLayoutEffect(() => {
    sceneRef.current = scene;
    drawRef.current();
  }, [scene, fallback]);

  // Cada cambio de progreso, un fotograma.
  useEffect(() => {
    const draw = () => drawRef.current();
    const unsubscribe = progress.on("change", () => frame.render(draw));
    return () => {
      unsubscribe();
      cancelFrame(draw);
    };
  }, [progress]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 size-full"
        style={{ display: fallback ? "none" : undefined }}
        aria-hidden="true"
      />
      {fallback ? (
        <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <path ref={fallbackOutlineRef} fill="none" stroke={YARN_COLORS.outline} strokeWidth={YARN.radius * 2 + 2} strokeLinecap="round" strokeLinejoin="round" />
          <path ref={fallbackPathRef} fill="none" stroke={YARN_COLORS.base} strokeWidth={YARN.radius * 2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </>
  );
}
