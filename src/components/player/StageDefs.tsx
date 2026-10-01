import { HOOK_MATERIALS } from "@/lib/svg/hook-geometry";
import { METAL_GRADIENTS, SLEEVE_GRADIENT, STAGE_COLORS } from "./stage-theme";

/** Identificadores de `<defs>` con prefijo único por instancia (varias SVG por página). */
export function stageIds(prefix: string) {
  return {
    metal: (material: string) => `${prefix}-metal-${material}`,
    sleeve: `${prefix}-sleeve`,
    grid: `${prefix}-grid`,
    background: `${prefix}-bg`,
    glow: `${prefix}-glow`,
    shadow: `${prefix}-shadow`,
  };
}

export type StageIds = ReturnType<typeof stageIds>;

/** Degradados de la aguja: los usan el reproductor y el diccionario visual. */
export function HookPaintDefs({ ids }: { ids: StageIds }) {
  return (
    <>
      {HOOK_MATERIALS.map((material) => {
        const [light, mid, dark] = METAL_GRADIENTS[material];
        return (
          <linearGradient key={material} id={ids.metal(material)} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="0.45" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
        );
      })}
      <linearGradient id={ids.sleeve} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={SLEEVE_GRADIENT[0]} />
        <stop offset="0.5" stopColor={SLEEVE_GRADIENT[1]} />
        <stop offset="1" stopColor={SLEEVE_GRADIENT[2]} />
      </linearGradient>
      <filter id={ids.shadow} x="-10%" y="-40%" width="120%" height="180%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
      </filter>
    </>
  );
}

export function StageDefs({ ids }: { ids: StageIds }) {
  return (
    <defs>
      <HookPaintDefs ids={ids} />
      <linearGradient id={ids.background} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={STAGE_COLORS.backgroundTop} />
        <stop offset="1" stopColor={STAGE_COLORS.backgroundBottom} />
      </linearGradient>
      <pattern id={ids.grid} width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.1" fill={STAGE_COLORS.grid} />
      </pattern>
      <filter id={ids.glow} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
