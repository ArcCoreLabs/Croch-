import { describe, expect, it } from "vitest";
import rawContent from "@/data/crochet-data.json";
import { compileTechniqueSteps } from "@/lib/content/compile";
import { parseContent } from "@/lib/content/load";
import type { CrochetData } from "@/lib/content/schema";
import { validateContentReferences } from "@/lib/content/validate";

const data = parseContent(rawContent);
const cadeneta = data.techniques.find((t) => t.id === "cadeneta")!;
const steps = compileTechniqueSteps(cadeneta, data);

describe("hilo 3D de la cadeneta", () => {
  it("es un único hilo continuo en todos los pasos, con la punta libre a la vista", () => {
    steps.forEach((step) => {
      expect(step.scene.strands.map((s) => s.id), step.id).toEqual(["hilo"]);
      expect(step.scene.strands[0].freeStart, step.id).toBe(true);
    });
  });

  it("todos los fotogramas tienen los mismos puntos 3D", () => {
    const lengths = new Set(steps.flatMap((step) => step.scene.strands[0].points.values.map((v) => v.length)));
    expect(lengths.size).toBe(1);
    expect([...lengths][0] % 3).toBe(0);
  });

  it("cada paso empieza exactamente donde acabó el anterior (sin saltos del hilo)", () => {
    for (let i = 1; i < steps.length; i++) {
      const before = steps[i - 1].scene.strands[0].points.values;
      const after = steps[i].scene.strands[0].points.values;
      expect(after[0], `${steps[i - 1].id} → ${steps[i].id}`).toEqual(before[before.length - 1]);
    }
  });

  it("dos puntos seguidos nunca se separan de más (el hilo no se estira ni se corta)", () => {
    steps.forEach((step) => {
      const spacing = step.scene.strands[0].spacing;
      step.scene.strands[0].points.values.forEach((flat, f) => {
        for (let i = 3; i < flat.length; i += 3) {
          const d = Math.hypot(flat[i] - flat[i - 3], flat[i + 1] - flat[i - 2], flat[i + 2] - flat[i - 1]);
          expect(d, `${step.id} fotograma ${f}, punto ${i / 3}`).toBeLessThan(spacing * 2.2);
        }
      });
    });
  });

  it("los tramos activos están dentro del hilo y barren por defecto", () => {
    steps.forEach((step) => {
      const strand = step.scene.strands[0];
      const points = strand.points.values[0].length / 3;
      strand.tone.forEach((span) => {
        expect(span.from, step.id).toBeGreaterThanOrEqual(0);
        expect(span.to, step.id).toBeLessThanOrEqual(points - 1);
        expect(span.mode, step.id).toBe("sweep");
      });
    });
  });
});

describe("validación de hilos", () => {
  const withData = (mutate: (draft: CrochetData) => void) => {
    const draft = structuredClone(parseContent(rawContent));
    mutate(draft);
    return validateContentReferences(draft);
  };
  const technique = (draft: CrochetData) => draft.techniques.find((t) => t.id === "cadeneta")!;

  it("detecta tramos activos que se salen del hilo", () => {
    const issues = withData((draft) => {
      technique(draft).steps[0].scene.strands!.hilo.tone = [{ range: [0, 999], value: 1 }];
    });
    expect(issues.some((i) => i.message.includes("se sale del hilo"))).toBe(true);
  });

  it("detecta referencias a pointSets inexistentes", () => {
    const issues = withData((draft) => {
      technique(draft).steps[0].scene.strands!.hilo.points = "@no-existe";
    });
    expect(issues.some((i) => i.message.includes("pointSet no encontrado"))).toBe(true);
  });

  it("exige el mismo número de puntos en todos los fotogramas", () => {
    const issues = withData((draft) => {
      const t = technique(draft);
      const [first] = Object.keys(t.pointSets!);
      t.pointSets!.corto = [
        [0, 0, 0],
        [1, 1, 1],
      ];
      t.steps[1].scene.strands!.hilo.points = [
        [0, `@${first}`],
        [1, "@corto"],
      ];
    });
    expect(issues.some((i) => i.message.includes("mismos puntos"))).toBe(true);
  });
});
