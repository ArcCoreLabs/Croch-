import { describe, expect, it } from "vitest";
import rawContent from "@/data/crochet-data.json";
import { parseContent } from "@/lib/content/load";
import { buildHookGeometry, HOOK_PART_IDS } from "@/lib/svg/hook-geometry";
import { areMorphCompatible, isValidPathData } from "@/lib/svg/path-utils";

const data = parseContent(rawContent);
const geometries = data.tools.hooks.map((hook) => buildHookGeometry(hook.profile, { tip: [18, 60], radius: 9 }));

describe("buildHookGeometry", () => {
  it("genera trazados SVG válidos para todos los tipos de aguja", () => {
    for (const geometry of geometries) {
      expect(isValidPathData(geometry.metal)).toBe(true);
      expect(isValidPathData(geometry.sleeve)).toBe(true);
      expect(isValidPathData(geometry.shine)).toBe(true);
    }
  });

  it("todos los perfiles comparten estructura (se pueden interpolar entre sí)", () => {
    expect(areMorphCompatible(geometries.map((g) => g.metal))).toBe(true);
    expect(areMorphCompatible(geometries.map((g) => g.sleeve))).toBe(true);
    expect(areMorphCompatible(geometries.map((g) => g.shine))).toBe(true);
  });

  it("las partes de la anatomía van de la punta al mango sin solaparse", () => {
    for (const geometry of geometries) {
      HOOK_PART_IDS.forEach((id, index) => {
        const part = geometry.parts[id];
        expect(part.x1).toBeGreaterThan(part.x0);
        if (index > 0) expect(part.x0).toBeGreaterThanOrEqual(geometry.parts[HOOK_PART_IDS[index - 1]].x1 - 0.001);
      });
    }
  });

  it("la garganta queda entre la punta y el cuerpo", () => {
    for (const geometry of geometries) {
      const [x] = geometry.throatPoint;
      expect(x).toBeGreaterThan(geometry.parts.punta.x0);
      expect(x).toBeLessThan(geometry.parts.cuerpo.x0);
    }
  });
});
