import { buildHookGeometry } from "@/lib/svg/hook-geometry";
import { compileTechniqueSteps } from "./compile";
import type { CrochetData, TechniqueInput } from "./schema";
import type {
  GlossaryTermView,
  HookGuideData,
  LearningLevel,
  MaterialView,
  TechniqueLesson,
  TechniqueSummary,
  YarnWeightView,
} from "./view-models";

/**
 * Selectores puros: reciben el contenido validado y devuelven exactamente lo
 * que necesita cada sección de la interfaz.
 */

export function toTechniqueSummary(technique: TechniqueInput): TechniqueSummary {
  return {
    id: technique.id,
    name: technique.name,
    abbr: technique.abbr?.es ?? null,
    status: technique.status,
    summary: technique.summary,
    difficulty: technique.difficulty,
    estimatedMinutes: technique.estimatedMinutes,
    prerequisites: technique.prerequisites,
  };
}

export function selectLearningPath(data: CrochetData): LearningLevel[] {
  const byId = new Map(data.techniques.map((t) => [t.id, t]));
  return [...data.levels]
    .sort((a, b) => a.order - b.order)
    .map((level) => ({
      id: level.id,
      order: level.order,
      title: level.title,
      subtitle: level.subtitle,
      description: level.description,
      range: level.range,
      techniques: level.techniques
        .map((id) => byId.get(id))
        .filter((t): t is TechniqueInput => t !== undefined)
        .map(toTechniqueSummary),
    }));
}

/** Geometría de la aguja para el diccionario visual (proporciones compactas). */
const ANATOMY_LAYOUT = { tip: [18, 60] as const, radius: 9, shaftLength: 22, handleLength: 12 };

export function selectHookGuide(data: CrochetData): HookGuideData {
  const types = data.tools.hooks.map((hook) => ({
    id: hook.id,
    name: hook.name,
    aka: hook.aka,
    material: hook.material,
    description: hook.description,
    bestFor: hook.bestFor,
    sizesMm: hook.sizesMm,
    geometry: buildHookGeometry(hook.profile, ANATOMY_LAYOUT),
  }));
  const maxX = Math.max(...types.map((t) => t.geometry.bounds.maxX));
  return {
    viewBox: [0, 34, Math.ceil(maxX + 14), 52],
    types,
    parts: data.tools.hookAnatomy.map((part) => ({ ...part })),
  };
}

export function selectYarnWeights(data: CrochetData): YarnWeightView[] {
  return [...data.tools.yarnWeights].sort((a, b) => a.cyc - b.cyc).map((y) => ({ ...y }));
}

export function selectMaterials(data: CrochetData): MaterialView[] {
  return data.tools.materials.map((m) => ({ ...m }));
}

export function selectGlossary(data: CrochetData): GlossaryTermView[] {
  return data.glossary.map((term) => ({
    id: term.id,
    term: term.term,
    abbr: term.abbr,
    us: term.us,
    uk: term.uk,
    aliases: term.aliases ?? [],
    definition: term.definition,
  }));
}

export function selectTechniqueLesson(data: CrochetData, id: string): TechniqueLesson | null {
  const technique = data.techniques.find((t) => t.id === id);
  if (!technique || technique.status !== "published") return null;
  return {
    technique: {
      ...toTechniqueSummary(technique),
      tips: technique.tips ?? [],
      commonMistakes: technique.commonMistakes ?? [],
    },
    steps: compileTechniqueSteps(technique, data),
  };
}
