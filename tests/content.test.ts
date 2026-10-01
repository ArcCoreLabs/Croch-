import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rawContent from "@/data/crochet-data.json";
import { compileTechniqueSteps } from "@/lib/content/compile";
import { buildContentJsonSchema } from "@/lib/content/json-schema";
import { parseContent } from "@/lib/content/load";
import type { CrochetData } from "@/lib/content/schema";
import { validateContentReferences } from "@/lib/content/validate";
import type { Track } from "@/lib/player/types";

const clone = (): CrochetData => structuredClone(parseContent(rawContent));

function expectWellFormed<T>(track: Track<T>, where: string) {
  expect(track.at.length, where).toBeGreaterThanOrEqual(2);
  expect(track.values.length, where).toBe(track.at.length);
  expect(track.ease.length, where).toBe(track.at.length - 1);
  expect(track.at[0], where).toBe(0);
  expect(track.at[track.at.length - 1], where).toBe(1);
  for (let i = 1; i < track.at.length; i++) expect(track.at[i], where).toBeGreaterThan(track.at[i - 1]);
}

describe("crochet-data.json", () => {
  it("cumple el esquema y no tiene referencias rotas", () => {
    expect(() => parseContent(rawContent)).not.toThrow();
  });

  it("el JSON Schema del editor está sincronizado con el esquema Zod", () => {
    const committed = readFileSync(new URL("../src/data/crochet-data.schema.json", import.meta.url), "utf8");
    expect(committed, "Ejecuta `npm run content:schema` para regenerarlo").toBe(buildContentJsonSchema());
  });

  it("compila todas las técnicas publicadas en pistas bien formadas", () => {
    const data = parseContent(rawContent);
    const published = data.techniques.filter((t) => t.status === "published");
    expect(published.length).toBeGreaterThan(0);

    for (const technique of published) {
      const steps = compileTechniqueSteps(technique, data);
      expect(steps.length).toBe(technique.steps.length);
      for (const step of steps) {
        for (const layer of [...step.scene.back, ...step.scene.front]) {
          const where = `${technique.id}/${step.id}/${layer.id}`;
          [layer.d, layer.draw, layer.trim, layer.opacity, layer.translateX, layer.translateY, layer.active].forEach(
            (track) => expectWellFormed<unknown>(track, where),
          );
        }
        step.scene.callouts.forEach((callout) => expectWellFormed(callout.opacity, `${step.id}/${callout.id}`));
      }
    }
  });

  it("la aguja no 'salta' entre pasos consecutivos (pose final = pose inicial siguiente)", () => {
    const data = parseContent(rawContent);
    for (const technique of data.techniques.filter((t) => t.status === "published")) {
      const steps = compileTechniqueSteps(technique, data);
      for (let i = 1; i < steps.length; i++) {
        const before = steps[i - 1].scene.hook;
        const after = steps[i].scene.hook;
        if (!before || !after) continue;
        const end = (track: Track<number>) => track.values[track.values.length - 1];
        const where = `${technique.id}: ${steps[i - 1].id} → ${steps[i].id}`;
        expect(after.translateX.values[0], where).toBeCloseTo(end(before.translateX));
        expect(after.translateY.values[0], where).toBeCloseTo(end(before.translateY));
        expect(after.rotate.values[0], where).toBeCloseTo(end(before.rotate));
      }
    }
  });
});

describe("validateContentReferences", () => {
  it("detecta identificadores duplicados", () => {
    const data = clone();
    data.techniques.push({ ...data.techniques[0] });
    expect(validateContentReferences(data).some((i) => i.message.includes("duplicado"))).toBe(true);
  });

  it("detecta geometrías @nombre inexistentes", () => {
    const data = clone();
    const cadeneta = data.techniques.find((t) => t.id === "cadeneta")!;
    cadeneta.steps[0].scene.layers[0].d = "@no-existe";
    expect(validateContentReferences(data).some((i) => i.message.includes("Geometría no encontrada"))).toBe(true);
  });

  it("detecta morphing entre trazados incompatibles", () => {
    const data = clone();
    const cadeneta = data.techniques.find((t) => t.id === "cadeneta")!;
    cadeneta.steps[0].scene.layers[0].d = [
      [0, "M 0 0 L 10 10"],
      [1, "M 0 0 C 1 1, 2 2, 3 3"],
    ];
    expect(validateContentReferences(data).some((i) => i.message.includes("no son compatibles"))).toBe(true);
  });

  it("detecta ciclos de prerrequisitos", () => {
    const data = clone();
    data.techniques.find((t) => t.id === "nudo-corredizo")!.prerequisites = ["punto-deslizado"];
    expect(validateContentReferences(data).some((i) => i.message.includes("Ciclo"))).toBe(true);
  });

  it("exige que los niveles cubran la ruta de 0 a 100 sin huecos", () => {
    const data = clone();
    data.levels[1].range = [20, 35];
    expect(validateContentReferences(data).some((i) => i.path.startsWith("levels"))).toBe(true);
  });

  it("detecta técnicas que no están en ningún nivel", () => {
    const data = clone();
    data.levels[0].techniques = data.levels[0].techniques.filter((id) => id !== "cadeneta");
    expect(validateContentReferences(data).some((i) => i.message.includes("no aparece en ningún nivel"))).toBe(true);
  });
});
