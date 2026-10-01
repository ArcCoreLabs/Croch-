import { describe, expect, it } from "vitest";
import rawContent from "@/data/crochet-data.json";
import { parseContent } from "@/lib/content/load";
import { selectLearningPath } from "@/lib/content/selectors";
import { computeLevelProgress, computeRouteProgress, findNextTechnique } from "@/lib/progress/route-progress";
import { areMorphCompatible, isValidPathData, pathSignature } from "@/lib/svg/path-utils";

const levels = selectLearningPath(parseContent(rawContent));
const allTechniques = levels.flatMap((level) => level.techniques.map((t) => t.id));

describe("ruta de 0 a 100", () => {
  it("vale 0 sin técnicas dominadas y 100 con todas", () => {
    expect(computeRouteProgress(levels, new Set())).toBe(0);
    expect(computeRouteProgress(levels, new Set(allTechniques))).toBe(100);
  });

  it("cada técnica suma su parte del tramo de su nivel", () => {
    const level0 = levels[0];
    const share = (level0.range[1] - level0.range[0]) / level0.techniques.length;
    expect(computeRouteProgress(levels, new Set(["cadeneta"]))).toBe(Math.round(share));
    expect(computeLevelProgress(level0, new Set(["cadeneta"]))).toBeCloseTo(1 / level0.techniques.length);
  });

  it("propone la siguiente técnica publicada no dominada", () => {
    expect(findNextTechnique(levels, new Set())?.technique.id).toBe("cadeneta");
    expect(findNextTechnique(levels, new Set(["cadeneta"]))).toBeNull();
  });
});

describe("path-utils", () => {
  it("reconoce trazados válidos e inválidos", () => {
    expect(isValidPathData("M 0 0 L 10 10")).toBe(true);
    expect(isValidPathData("L 10 10")).toBe(false);
    expect(isValidPathData("M 0 0 <script>")).toBe(false);
  });

  it("compara la estructura de los trazados para el morphing", () => {
    expect(pathSignature("M 0 0 C 1 1, 2 2, 3 3")).toBe("MC#8");
    expect(areMorphCompatible(["M 0 0 L 1 1", "M 5 5 L 9 -9"])).toBe(true);
    expect(areMorphCompatible(["M 0 0 L 1 1", "M 0 0 Q 1 1 2 2"])).toBe(false);
  });
});
