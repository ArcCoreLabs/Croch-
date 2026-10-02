import { describe, expect, it } from "vitest";
import rawContent from "@/data/crochet-data.json";
import { compileTechniqueSteps } from "@/lib/content/compile";
import { parseContent } from "@/lib/content/load";
import { crochetDataSchema, type CrochetData } from "@/lib/content/schema";
import { validateContentReferences } from "@/lib/content/validate";
import { areMorphCompatible } from "@/lib/svg/path-utils";
import { strandPath, type StrandPoint } from "@/lib/svg/strand";

const POINTS: StrandPoint[] = [
  [0, 0],
  [10, 5],
  [20, 0],
  [30, 10],
  [40, 0],
];

const numbers = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe("strandPath", () => {
  it("dibuja un segmento cúbico por cada par de puntos del tramo", () => {
    expect(strandPath(POINTS)).toMatch(/^M 0 0( C [^C]+){4}$/);
    expect(strandPath(POINTS, 1, 3).match(/C/g)).toHaveLength(2);
  });

  it("dos tramos contiguos encajan sin costura (mismo punto y tangente)", () => {
    const left = numbers(strandPath(POINTS, 0, 2));
    const right = numbers(strandPath(POINTS, 2, 4));
    // Fin del tramo izquierdo = inicio del derecho.
    expect(left.slice(-2)).toEqual(right.slice(0, 2));
    // Segundo punto de control de la izquierda y primero de la derecha son simétricos respecto a la unión.
    const [jx, jy] = right.slice(0, 2);
    const [c2x, c2y] = left.slice(-4, -2);
    const [c1x, c1y] = right.slice(2, 4);
    expect(c1x - jx).toBeCloseTo(jx - c2x);
    expect(c1y - jy).toBeCloseTo(jy - c2y);
  });

  it("rechaza tramos fuera del hilo", () => {
    expect(() => strandPath(POINTS, 3, 9)).toThrow(RangeError);
    expect(() => strandPath(POINTS, 2, 2)).toThrow(RangeError);
  });
});

describe("hilos continuos en el contenido", () => {
  const data = parseContent(rawContent);
  const cadeneta = data.techniques.find((t) => t.id === "cadeneta")!;

  it("la cadeneta es un único hilo de principio a fin en todos los pasos", () => {
    cadeneta.steps.forEach((step) => {
      const strands = Object.keys(step.scene.strands ?? {});
      expect(strands, step.id).toEqual(["hilo"]);
      const yarnLayers = step.scene.layers.filter((layer) => layer.role === "yarn");
      expect(yarnLayers.every((layer) => layer.strand === "hilo"), step.id).toBe(true);
      // Los tramos de atrás cubren el hilo entero sin huecos: solo hay dos puntas.
      const back = yarnLayers.filter((l) => l.depth === "back" && l.activeFrom === undefined).map((l) => l.range!);
      const sorted = [...back].sort((a, b) => a[0] - b[0]);
      expect(sorted[0][0], step.id).toBe(0);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i][0], step.id).toBe(sorted[i - 1][1]);
    });
  });

  it("cada tramo compilado se puede interpolar entre todos sus fotogramas", () => {
    compileTechniqueSteps(cadeneta, data).forEach((step) => {
      [...step.scene.back, ...step.scene.front].forEach((layer) => {
        expect(areMorphCompatible(layer.d.values), `${step.id}/${layer.id}`).toBe(true);
      });
    });
  });

  it("el degradado del cuello sigue a los extremos de su tramo", () => {
    const lazada = compileTechniqueSteps(cadeneta, data).find((s) => s.id === "lazada")!;
    const cuello = lazada.scene.back.find((l) => l.id === "hilo-cuello")!;
    expect(cuello.gradient).not.toBeNull();
    expect(cuello.gradient!.x1.at).toEqual(cuello.d.at);
  });
});

describe("validación de hilos", () => {
  const withScene = (mutate: (data: CrochetData) => void) => {
    const data = structuredClone(parseContent(rawContent));
    mutate(data);
    return validateContentReferences(data);
  };
  const cadeneta = (data: CrochetData) => data.techniques.find((t) => t.id === "cadeneta")!;

  it("detecta tramos que se salen del hilo", () => {
    const issues = withScene((data) => {
      cadeneta(data).steps[0].scene.layers.find((l) => l.strand)!.range = [0, 999];
    });
    expect(issues.some((i) => i.message.includes("se sale del hilo"))).toBe(true);
  });

  it("detecta referencias a pointSets inexistentes", () => {
    const issues = withScene((data) => {
      cadeneta(data).steps[0].scene.strands!.hilo.points = "@no-existe";
    });
    expect(issues.some((i) => i.message.includes("pointSet no encontrado"))).toBe(true);
  });

  it("exige el mismo número de puntos en todos los fotogramas", () => {
    const issues = withScene((data) => {
      const technique = cadeneta(data);
      technique.pointSets!["corto"] = [
        [0, 0],
        [1, 1],
      ];
      technique.steps[1].scene.strands!.hilo.points = [
        [0, "@libre-0"],
        [1, "@corto"],
      ];
    });
    expect(issues.some((i) => i.message.includes("mismos puntos"))).toBe(true);
  });

  it("una capa no puede tener `d` y `strand` a la vez", () => {
    const data = structuredClone(rawContent) as { techniques: { id: string; steps: { scene: { layers: Record<string, unknown>[] } }[] }[] };
    const layer = data.techniques.find((t) => t.id === "cadeneta")!.steps[0].scene.layers.find((l) => l.strand)!;
    layer.d = "M 0 0 L 1 1";
    expect(crochetDataSchema.safeParse(data).success).toBe(false);
  });
});
