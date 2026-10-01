import { describe, expect, it } from "vitest";
import { calloutOpacityTrack, constantTrack, framesToTrack } from "@/lib/content/compile";

describe("framesToTrack", () => {
  it("rellena los extremos 0 y 1 manteniendo los valores", () => {
    expect(framesToTrack([[0.2, 5], [0.6, 9]])).toEqual({
      at: [0, 0.2, 0.6, 1],
      values: [5, 5, 9, 9],
      ease: ["linear", "easeInOut", "linear"],
    });
  });

  it("respeta el easing explícito del tramo que termina en el fotograma", () => {
    const track = framesToTrack([[0, 0], [1, 10, "easeOut"]]);
    expect(track.ease).toEqual(["easeOut"]);
  });

  it("convierte un único fotograma en una pista constante", () => {
    expect(framesToTrack([[1, 3]])).toEqual({ at: [0, 1], values: [3, 3], ease: ["linear"] });
  });

  it("constantTrack siempre tiene dos claves", () => {
    expect(constantTrack("M 0 0")).toEqual({ at: [0, 1], values: ["M 0 0", "M 0 0"], ease: ["linear"] });
  });
});

describe("calloutOpacityTrack", () => {
  it("aparece y desaparece dentro de la ventana", () => {
    const track = calloutOpacityTrack({ from: 0.3, to: 0.7 });
    expect(track.values[0]).toBe(0);
    expect(track.values[track.values.length - 1]).toBe(0);
    expect(Math.max(...track.values)).toBe(1);
    for (let i = 1; i < track.at.length; i++) expect(track.at[i]).toBeGreaterThan(track.at[i - 1]);
  });

  it("sin `to` queda visible hasta el final", () => {
    const track = calloutOpacityTrack({ from: 0.5 });
    expect(track.values[track.values.length - 1]).toBe(1);
  });

  it("visible desde el inicio cuando `from` es 0", () => {
    expect(calloutOpacityTrack({ from: 0 }).values[0]).toBe(1);
  });
});
