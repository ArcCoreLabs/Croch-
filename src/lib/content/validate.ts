import { areMorphCompatible, isValidPathData } from "@/lib/svg/path-utils";
import type { CrochetData, SceneInput } from "./schema";
import { resolveStrandFrames, type PointSets } from "./strands";

/**
 * Validación semántica del contenido (lo que un esquema por sí solo no ve):
 * identificadores únicos, referencias cruzadas, ciclos de prerrequisitos,
 * geometrías `@nombre` existentes y trazados compatibles para morphing.
 */

export interface ContentIssue {
  path: string;
  message: string;
}

type GeometryTable = Record<string, string> | undefined;

export function resolvePathRef(value: string, local: GeometryTable, library: Record<string, string>): string | null {
  if (!value.startsWith("@")) return value;
  const name = value.slice(1);
  return local?.[name] ?? library[name] ?? null;
}

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

export function validateContentReferences(data: CrochetData): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const push = (path: string, message: string) => issues.push({ path, message });

  const checkUnique = (path: string, ids: readonly string[]) => {
    for (const dupe of findDuplicates(ids)) push(path, `Identificador duplicado: "${dupe}".`);
  };

  const levelIds = new Set(data.levels.map((l) => l.id));
  const techniqueIds = new Set(data.techniques.map((t) => t.id));
  const hookIds = new Set(data.tools.hooks.map((h) => h.id));
  const materialIds = new Set(data.tools.materials.map((m) => m.id));
  const yarnIds = new Set(data.tools.yarnWeights.map((y) => y.id));

  checkUnique("levels", data.levels.map((l) => l.id));
  checkUnique("techniques", data.techniques.map((t) => t.id));
  checkUnique("tools.hooks", data.tools.hooks.map((h) => h.id));
  checkUnique("tools.hookAnatomy", data.tools.hookAnatomy.map((p) => p.id));
  checkUnique("tools.yarnWeights", data.tools.yarnWeights.map((y) => y.id));
  checkUnique("tools.materials", data.tools.materials.map((m) => m.id));
  checkUnique("glossary", data.glossary.map((g) => g.id));
  checkUnique("projects", data.projects.map((p) => p.id));

  // --- Niveles: tramos ordenados y contiguos de 0 a 100 -------------------
  const sortedLevels = [...data.levels].sort((a, b) => a.order - b.order);
  let cursor = 0;
  sortedLevels.forEach((level) => {
    const [start, end] = level.range;
    if (start >= end) push(`levels.${level.id}.range`, "El inicio del tramo debe ser menor que el final.");
    if (start !== cursor) push(`levels.${level.id}.range`, `El tramo debería empezar en ${cursor} (contiguo al nivel anterior).`);
    cursor = end;
    level.techniques.forEach((id) => {
      if (!techniqueIds.has(id)) push(`levels.${level.id}.techniques`, `Técnica inexistente: "${id}".`);
    });
  });
  if (cursor !== 100) push("levels", `La ruta debe terminar en 100 (termina en ${cursor}).`);

  // --- Técnicas ------------------------------------------------------------
  const levelOfTechnique = new Map<string, string>();
  data.levels.forEach((level) => level.techniques.forEach((t) => levelOfTechnique.set(t, level.id)));

  for (const technique of data.techniques) {
    const base = `techniques.${technique.id}`;
    if (!levelIds.has(technique.level)) push(`${base}.level`, `Nivel inexistente: "${technique.level}".`);
    const listedIn = levelOfTechnique.get(technique.id);
    if (!listedIn) push(base, `La técnica no aparece en ningún nivel (añádela a "${technique.level}.techniques").`);
    else if (listedIn !== technique.level)
      push(`${base}.level`, `Declara el nivel "${technique.level}" pero está listada en "${listedIn}".`);

    technique.prerequisites.forEach((id) => {
      if (id === technique.id) push(`${base}.prerequisites`, "Una técnica no puede ser prerrequisito de sí misma.");
      else if (!techniqueIds.has(id)) push(`${base}.prerequisites`, `Técnica inexistente: "${id}".`);
    });
    technique.materials?.forEach((id) => {
      if (!materialIds.has(id)) push(`${base}.materials`, `Material inexistente: "${id}".`);
    });
    if (technique.stage?.hook?.type && !hookIds.has(technique.stage.hook.type)) {
      push(`${base}.stage.hook.type`, `Tipo de aguja inexistente: "${technique.stage.hook.type}".`);
    }

    checkUnique(`${base}.steps`, technique.steps.map((s) => s.id));
    technique.steps.forEach((step) => {
      validateScene(
        step.scene,
        `${base}.steps.${step.id}.scene`,
        technique.geometry,
        data.svgLibrary.shapes,
        technique.pointSets,
        hookIds,
        push,
      );
    });
  }

  validatePrerequisiteCycles(data, push);

  // --- Glosario --------------------------------------------------------------
  data.glossary.forEach((term) => {
    if (term.technique && !techniqueIds.has(term.technique)) {
      push(`glossary.${term.id}.technique`, `Técnica inexistente: "${term.technique}".`);
    }
  });

  // --- Proyectos -------------------------------------------------------------
  for (const project of data.projects) {
    const base = `projects.${project.id}`;
    if (!levelIds.has(project.level)) push(`${base}.level`, `Nivel inexistente: "${project.level}".`);
    if (!yarnIds.has(project.yarnWeight)) push(`${base}.yarnWeight`, `Grosor inexistente: "${project.yarnWeight}".`);
    project.requirements.techniques.forEach((id) => {
      if (!techniqueIds.has(id)) push(`${base}.requirements.techniques`, `Técnica inexistente: "${id}".`);
    });
    project.requirements.materials.forEach(({ material }) => {
      if (!materialIds.has(material)) push(`${base}.requirements.materials`, `Material inexistente: "${material}".`);
    });
    checkUnique(`${base}.steps`, project.steps.map((s) => s.id));
    project.steps.forEach((step) => {
      if (step.technique && !techniqueIds.has(step.technique)) {
        push(`${base}.steps.${step.id}.technique`, `Técnica inexistente: "${step.technique}".`);
      }
      if (step.scene) {
        validateScene(
          step.scene,
          `${base}.steps.${step.id}.scene`,
          project.geometry,
          data.svgLibrary.shapes,
          project.pointSets,
          hookIds,
          push,
        );
      }
    });
  }

  // --- Biblioteca SVG ---------------------------------------------------------
  Object.entries(data.svgLibrary.shapes).forEach(([name, d]) => {
    if (!isValidPathData(d)) push(`svgLibrary.shapes.${name}`, "Trazado SVG no válido.");
  });

  return issues;
}

function validateScene(
  scene: SceneInput,
  base: string,
  local: GeometryTable,
  library: Record<string, string>,
  pointSets: PointSets,
  hookIds: Set<string>,
  push: (path: string, message: string) => void,
) {
  if (scene.hook && scene.hook.type && !hookIds.has(scene.hook.type)) {
    push(`${base}.hook.type`, `Tipo de aguja inexistente: "${scene.hook.type}".`);
  }

  const layerIds = scene.layers.map((l) => l.id);
  for (const dupe of findDuplicates(layerIds)) push(`${base}.layers`, `Capa duplicada: "${dupe}".`);
  const calloutIds = (scene.callouts ?? []).map((c) => c.id);
  for (const dupe of findDuplicates(calloutIds)) push(`${base}.callouts`, `Etiqueta duplicada: "${dupe}".`);

  const strandLengths = new Map<string, number>();
  Object.entries(scene.strands ?? {}).forEach(([id, strand]) => {
    const frames = resolveStrandFrames(strand, pointSets);
    frames.forEach((frame) => {
      if (frame.points === null) push(`${base}.strands.${id}`, `pointSet no encontrado: "${frame.ref}".`);
    });
    const lengths = new Set(frames.filter((f) => f.points !== null).map((f) => f.points!.length));
    if (lengths.size > 1) {
      push(`${base}.strands.${id}`, `Todos los fotogramas de un hilo deben tener los mismos puntos (hay ${[...lengths].join(", ")}).`);
    }
    if (lengths.size === 1) strandLengths.set(id, [...lengths][0]);
  });

  Object.entries(scene.strands ?? {}).forEach(([id, strand]) => {
    const length = strandLengths.get(id);
    strand.tone?.forEach((span, i) => {
      const path = `${base}.strands.${id}.tone.${i}`;
      if (span.range[0] > span.range[1]) push(`${path}.range`, "`range` debe ir de un índice menor a uno mayor.");
      else if (length !== undefined && span.range[1] > length - 1) {
        push(`${path}.range`, `El tramo [${span.range.join(", ")}] se sale del hilo (${length} puntos).`);
      }
    });
  });

  scene.layers.forEach((layer) => {
    const path = `${base}.layers.${layer.id}`;
    const rawPaths = Array.isArray(layer.d) ? layer.d.map((frame) => frame[1]) : [layer.d];

    const resolved: string[] = [];
    rawPaths.forEach((value) => {
      const d = resolvePathRef(value, local, library);
      if (d === null) push(`${path}.d`, `Geometría no encontrada: "${value}".`);
      else if (!isValidPathData(d)) push(`${path}.d`, `Trazado SVG no válido: "${value.slice(0, 40)}…".`);
      else resolved.push(d);
    });
    if (rawPaths.length > 0 && resolved.length === rawPaths.length && !areMorphCompatible(resolved)) {
      push(
        `${path}.d`,
        "Los trazados del morphing no son compatibles: deben tener los mismos comandos (M, C, L…) y la misma cantidad de números.",
      );
    }

    if (layer.draw && typeof layer.draw === "object" && !Array.isArray(layer.draw) && layer.draw.from >= layer.draw.to) {
      push(`${path}.draw`, "`draw.from` debe ser menor que `draw.to`.");
    }
    if (layer.active !== undefined && layer.role !== "yarn") {
      push(`${path}.active`, "`active` solo aplica a capas de hilo (`role: \"yarn\"`).");
    }
    if (layer.attach === "hook" && scene.hook === false) {
      push(`${path}.attach`, "La capa va pegada a la aguja, pero la aguja está oculta en este paso.");
    }
  });

  scene.callouts?.forEach((callout) => {
    if (callout.show.to !== undefined && callout.show.to <= callout.show.from) {
      push(`${base}.callouts.${callout.id}.show`, "`show.to` debe ser mayor que `show.from`.");
    }
  });
}

function validatePrerequisiteCycles(data: CrochetData, push: (path: string, message: string) => void) {
  const graph = new Map(data.techniques.map((t) => [t.id, t.prerequisites]));
  const state = new Map<string, "visiting" | "done">();

  const visit = (id: string, trail: string[]): void => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      push(`techniques.${id}.prerequisites`, `Ciclo de prerrequisitos: ${[...trail, id].join(" → ")}.`);
      return;
    }
    state.set(id, "visiting");
    for (const next of graph.get(id) ?? []) {
      if (graph.has(next)) visit(next, [...trail, id]);
    }
    state.set(id, "done");
  };

  for (const id of graph.keys()) visit(id, []);
}
