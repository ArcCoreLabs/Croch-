import type { HookMaterial } from "@/lib/svg/hook-geometry";
import type { Phase } from "@/lib/player/types";

/**
 * Paleta del "escenario" del reproductor: fondo oscuro cálido para que el
 * hilo base (azul), el hilo activo (amarillo) y la aguja metálica tengan el
 * máximo contraste, tanto en tema claro como oscuro.
 */
export const STAGE_COLORS = {
  backgroundTop: "#2f2622",
  backgroundBottom: "#221b18",
  grid: "rgba(255, 244, 230, 0.07)",
  yarn: {
    base: { core: "#5b9bff", outline: "#1b3a78", sheen: "#b9d4ff" },
    active: { core: "#ffd43b", outline: "#7a5600", sheen: "#fff3b8" },
  },
  guide: "#fff4e0",
  focus: "#ffd43b",
  hand: { fill: "rgba(255, 238, 220, 0.12)", stroke: "rgba(255, 238, 220, 0.42)" },
  metalOutline: "#3f4752",
  /** Opacidad de la aguja: deja ver el hilo que pasa por detrás. */
  hookOpacity: 0.86,
  /** Opacidad de los tramos de hilo físicamente ocultos. */
  translucent: 0.42,
} as const;

export const YARN_WIDTH = 6;
export const YARN_OUTLINE = 2.6;

export const METAL_GRADIENTS: Record<HookMaterial, readonly [string, string, string]> = {
  aluminio: ["#f6f8fb", "#c9d0d9", "#87909d"],
  acero: ["#eef1f5", "#aab2bd", "#5b6470"],
  bambu: ["#f4dcae", "#d9b47a", "#a87c43"],
};

export const SLEEVE_GRADIENT = ["#e8957a", "#c8664a", "#94452f"] as const;

export interface PhaseMeta {
  order: number;
  label: string;
  description: string;
  /** Clase de color (Tailwind) para chips e indicadores. */
  tone: string;
}

export const PHASE_META: Record<Phase, PhaseMeta> = {
  hold: { order: 1, label: "Posición", description: "Sujetar aguja e hilo", tone: "bg-sage-500" },
  insert: { order: 2, label: "Introducir", description: "Meter la aguja", tone: "bg-terracotta-500" },
  "yarn-over": { order: 3, label: "Lazada", description: "Enganchar el hilo", tone: "bg-honey-500" },
  "pull-through": { order: 4, label: "Tirar", description: "Pasar por el bucle", tone: "bg-lavender-500" },
};

export const PHASE_ORDER: Phase[] = ["hold", "insert", "yarn-over", "pull-through"];
