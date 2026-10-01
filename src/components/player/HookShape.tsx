import type { CompiledHookShape } from "@/lib/player/types";
import { STAGE_COLORS } from "./stage-theme";
import type { StageIds } from "./StageDefs";

interface HookShapeProps {
  shape: CompiledHookShape;
  ids: StageIds;
  /** En el escenario la aguja es semitransparente donde el hilo pasa por detrás. */
  translucent?: boolean;
}

/** Pintura de la aguja generada por código (metal + funda + brillo). */
export function HookShape({ shape, ids, translucent = false }: HookShapeProps) {
  return (
    <g filter={translucent ? `url(#${ids.shadow})` : undefined}>
      <path
        d={shape.metal}
        fill={`url(#${ids.metal(shape.material)})`}
        fillOpacity={translucent ? STAGE_COLORS.hookOpacity : 1}
        stroke={STAGE_COLORS.metalOutline}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <path
        d={shape.sleeve}
        fill={`url(#${ids.sleeve})`}
        stroke="#7a3826"
        strokeWidth={0.8}
        opacity={shape.sleeveVisible ? 1 : 0}
      />
      <path d={shape.shine} fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}
