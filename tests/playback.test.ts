import { describe, expect, it } from "vitest";
import { createPlaybackState, playbackReducer, type PlaybackState } from "@/components/player/playback";

const initial = createPlaybackState(4);

describe("playbackReducer", () => {
  it("empieza en reposo en el primer paso", () => {
    expect(initial).toMatchObject({ index: 0, status: "idle", speed: 1, autoAdvance: false, finished: false });
  });

  it("reproducir y pausar", () => {
    const playing = playbackReducer(initial, { type: "play" });
    expect(playing.status).toBe("playing");
    expect(playing.playToken).toBe(initial.playToken + 1);
    expect(playbackReducer(playing, { type: "pause" }).status).toBe("paused");
    // Pausar sin reproducir no cambia nada.
    expect(playbackReducer(initial, { type: "pause" })).toBe(initial);
  });

  it("ir a otro paso con reproducción automática", () => {
    const next = playbackReducer(initial, { type: "goto", index: 2, autoplay: true, reducedMotion: false });
    expect(next).toMatchObject({ index: 2, status: "playing" });
  });

  it("con movimiento reducido muestra el paso terminado en vez de animarlo", () => {
    const next = playbackReducer(initial, { type: "goto", index: 1, autoplay: false, reducedMotion: true });
    expect(next).toMatchObject({ index: 1, status: "ended" });
  });

  it("limita el índice a los pasos existentes", () => {
    expect(playbackReducer(initial, { type: "goto", index: 99, autoplay: false, reducedMotion: false }).index).toBe(3);
    expect(playbackReducer(initial, { type: "goto", index: -5, autoplay: false, reducedMotion: false }).index).toBe(0);
  });

  it("marca la lección como terminada al completar el último paso", () => {
    const last: PlaybackState = { ...initial, index: 3, status: "playing" };
    expect(playbackReducer(last, { type: "complete" })).toMatchObject({ status: "ended", finished: true });
    const middle: PlaybackState = { ...initial, index: 1, status: "playing" };
    expect(playbackReducer(middle, { type: "complete" }).finished).toBe(false);
  });

  it("buscar con el slider pausa (o termina si llega al 100 %)", () => {
    const playing = playbackReducer(initial, { type: "play" });
    expect(playbackReducer(playing, { type: "seek", atEnd: false }).status).toBe("paused");
    expect(playbackReducer(playing, { type: "seek", atEnd: true }).status).toBe("ended");
  });

  it("velocidad y avance automático", () => {
    expect(playbackReducer(initial, { type: "setSpeed", speed: 0.5 }).speed).toBe(0.5);
    expect(playbackReducer(initial, { type: "setSpeed", speed: 1 })).toBe(initial);
    expect(playbackReducer(initial, { type: "setAutoAdvance", value: true }).autoAdvance).toBe(true);
  });
});
