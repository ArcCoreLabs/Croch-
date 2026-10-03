import { describe, expect, it } from "vitest";
import { locateTrack, sampleNumber, sampleNumbers } from "@/lib/player/track";
import type { CompiledToneSpan, EaseName, Track } from "@/lib/player/types";
import { buildStrandCurve, curvePath, pointAt, sampleStrand } from "@/lib/yarn/curve";
import { toneAt, toneSpanAt } from "@/lib/yarn/tone";
import { buildTube, FLOATS_PER_VERTEX, SIDES, tubeIndices, tubeRingCount } from "@/lib/yarn/tube";

const linear = () => (t: number) => t;

/** Hilo recto a lo largo de x, en el plano z = 0. */
const STRAIGHT = [0, 0, 0, 10, 0, 0, 20, 0, 0, 30, 0, 0];

const track = <T>(at: number[], values: T[], ease: EaseName[] = at.slice(1).map(() => "linear")): Track<T> => ({ at, values, ease });

describe("curva del hilo", () => {
  it("pasa por todos los puntos del hilo", () => {
    const points = [0, 0, 0, 10, 5, 2, 20, 0, -3, 30, 8, 1];
    const curve = buildStrandCurve(points);
    expect(curve.count).toBe(4);
    for (let i = 0; i < 4; i++) {
      const p = pointAt(curve, i);
      expect(p[0]).toBeCloseTo(points[i * 3]);
      expect(p[1]).toBeCloseTo(points[i * 3 + 1]);
      expect(p[2]).toBeCloseTo(points[i * 3 + 2]);
    }
  });

  it("muestrea con densidad fija y conserva la posición en el hilo", () => {
    const samples = sampleStrand(buildStrandCurve(STRAIGHT), 6);
    expect(samples.length).toBe(3 * 6 + 1);
    expect(samples.u[0]).toBe(0);
    expect(samples.u[samples.length - 1]).toBe(3);
    expect(samples.x[6]).toBeCloseTo(10);
  });

  it("el trazado SVG de un tramo empieza y acaba en el hilo", () => {
    const curve = buildStrandCurve(STRAIGHT);
    expect(curvePath(curve, 0, 3)).toMatch(/^M0 0C.* 30 0$/);
    const numbers = (curvePath(curve, 0.5, 1.5).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const [sx, sy] = pointAt(curve, 0.5);
    const [ex, ey] = pointAt(curve, 1.5);
    expect(numbers[0]).toBeCloseTo(sx, 1);
    expect(numbers[1]).toBeCloseTo(sy, 1);
    expect(numbers[numbers.length - 2]).toBeCloseTo(ex, 1);
    expect(numbers[numbers.length - 1]).toBeCloseTo(ey, 1);
  });

  it("rechaza hilos de menos de dos puntos", () => {
    expect(() => buildStrandCurve([1, 2, 3])).toThrow(RangeError);
  });
});

describe("malla de tubo", () => {
  const samples = sampleStrand(buildStrandCurve(STRAIGHT), 4);

  it("un anillo por muestra, más la tapa de la punta libre", () => {
    const open = buildTube({ samples, radius: 3.5, spacing: 5, tone: () => 0, capStart: false });
    const capped = buildTube({ samples, radius: 3.5, spacing: 5, tone: () => 0, capStart: true });
    expect(open.rings).toBe(samples.length);
    expect(capped.rings).toBe(tubeRingCount(samples, true));
    expect(capped.rings).toBeGreaterThan(open.rings);
    expect(open.vertexCount).toBe(open.rings * SIDES);
    expect(tubeIndices(open.rings).length).toBe((open.rings - 1) * SIDES * 6);
  });

  it("los vértices quedan a un radio del eje y el material avanza con el hilo", () => {
    const tube = buildTube({ samples, radius: 3.5, spacing: 5, tone: (u) => (u > 1.5 ? 1 : 0), capStart: false });
    const v = tube.vertices;
    for (let k = 0; k < tube.vertexCount; k++) {
      const o = k * FLOATS_PER_VERTEX;
      expect(Math.hypot(v[o + 1], v[o + 2])).toBeCloseTo(3.5, 4);
    }
    const last = (tube.vertexCount - 1) * FLOATS_PER_VERTEX;
    expect(v[6]).toBeCloseTo(0);
    expect(v[last + 6]).toBeCloseTo(15);
    expect(v[8]).toBe(0);
    expect(v[last + 8]).toBe(1);
  });

  it("la costura de θ queda detrás del hilo (θ = 0 mira a la cámara)", () => {
    const tube = buildTube({ samples, radius: 1, spacing: 5, tone: () => 0, capStart: false });
    const v = tube.vertices;
    const front = SIDES / 2;
    expect(v[front * FLOATS_PER_VERTEX + 7]).toBeCloseTo(0);
    expect(v[front * FLOATS_PER_VERTEX + 2]).toBeCloseTo(1);
  });
});

describe("tramos activos (tono)", () => {
  const span = (value: Track<number>, mode: CompiledToneSpan["mode"] = "sweep"): CompiledToneSpan => ({ from: 10, to: 20, feather: 1, value, mode });

  it("fundido: el valor escala todo el tramo", () => {
    const state = toneSpanAt(span(track([0, 1], [0, 1]), "fade"), 0.5, linear);
    expect(toneAt([state], 15)).toBeCloseTo(0.5);
    expect(toneAt([state], 5)).toBe(0);
  });

  it("barrido: al encenderse avanza desde el principio del tramo", () => {
    const state = toneSpanAt(span(track([0, 1], [0, 1])), 0.5, linear);
    expect(toneAt([state], 11)).toBe(1);
    expect(toneAt([state], 19)).toBe(0);
  });

  it("barrido: al apagarse se borra en el mismo sentido (de la cola al ovillo)", () => {
    const state = toneSpanAt(span(track([0, 1], [1, 0])), 0.5, linear);
    expect(toneAt([state], 11)).toBe(0);
    expect(toneAt([state], 19)).toBe(1);
  });

  it("barrido: los extremos coinciden con el tramo apagado y encendido", () => {
    const on = span(track([0, 1], [0, 1]));
    const off = toneSpanAt(on, 0, linear);
    const full = toneSpanAt(on, 1, linear);
    for (const u of [8, 9.5, 10, 15, 20, 20.5, 22]) {
      expect(toneAt([off], u)).toBe(0);
      expect(toneAt([full], u)).toBeCloseTo(toneAt([{ from: 10, to: 20, feather: 1, value: 1 }], u));
    }
  });

  it("varios tramos: gana el más encendido", () => {
    const spans = [
      { from: 0, to: 5, feather: 0, value: 0.3 },
      { from: 3, to: 8, feather: 0, value: 1 },
    ];
    expect(toneAt(spans, 4)).toBe(1);
    expect(toneAt(spans, 1)).toBe(0.3);
  });
});

describe("lectura de pistas", () => {
  it("localiza el tramo y aplica su easing", () => {
    const t = track([0, 0.5, 1], [0, 10, 20], ["linear", "easeIn"]);
    expect(locateTrack(t, 0.25, linear)).toEqual([0, 0.5]);
    const squared = (name: EaseName) => (name === "easeIn" ? (x: number) => x * x : (x: number) => x);
    expect(sampleNumber(t, 0.75, squared)).toBeCloseTo(12.5);
    expect(sampleNumber(t, -1, linear)).toBe(0);
    expect(sampleNumber(t, 2, linear)).toBe(20);
  });

  it("interpola listas de números (los puntos de un hilo)", () => {
    const t = track([0, 1], [
      [0, 0, 0],
      [10, 20, 30],
    ]);
    expect(Array.from(sampleNumbers(t, 0.5, linear))).toEqual([5, 10, 15]);
    const out = new Float64Array(3);
    expect(sampleNumbers(t, 1, linear, out)).toBe(out);
  });
});
