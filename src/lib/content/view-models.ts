/**
 * Formas de datos ya preparadas que el servidor entrega a los componentes
 * cliente. Solo tipos: importar este archivo no arrastra Zod ni el JSON.
 */

import type { CompiledStep } from "@/lib/player/types";
import type { HookGeometry, HookMaterial, HookPartId } from "@/lib/svg/hook-geometry";

export interface TechniqueSummary {
  id: string;
  name: string;
  abbr: string | null;
  status: "published" | "draft";
  summary: string;
  difficulty: number;
  estimatedMinutes: number;
  prerequisites: string[];
}

export interface LearningLevel {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  range: [number, number];
  techniques: TechniqueSummary[];
}

export interface HookTypeView {
  id: string;
  name: string;
  aka: string[];
  material: HookMaterial;
  description: string;
  bestFor: string;
  sizesMm: [number, number];
  geometry: HookGeometry;
}

export interface HookPartView {
  id: HookPartId;
  name: string;
  role: string;
  description: string;
}

export interface HookGuideData {
  viewBox: [number, number, number, number];
  types: HookTypeView[];
  parts: HookPartView[];
}

export interface YarnWeightView {
  id: string;
  cyc: number;
  name: string;
  aka: string[];
  hookMm: [number, number | null];
  uses: string;
  amigurumi: string;
  strandWidth: number;
}

export interface MaterialView {
  id: string;
  name: string;
  description: string;
  icon: "hook" | "yarn" | "scissors" | "needle" | "marker" | "stuffing" | "eyes" | "pins";
  essential: boolean;
}

export interface GlossaryTermView {
  id: string;
  term: string;
  abbr: { es: string; us?: string; uk?: string };
  us: string;
  uk: string;
  aliases: string[];
  definition: string;
}

export interface TechniqueLesson {
  technique: TechniqueSummary & { tips: string[]; commonMistakes: string[] };
  steps: CompiledStep[];
}
