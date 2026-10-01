/**
 * Máquina de estados del reproductor (pura y testeable).
 *
 * El progreso del paso (0–1) vive en un MotionValue fuera de React para
 * animar a 60 fps sin re-renderizar; este reducer solo gobierna el estado de
 * la interfaz: qué paso se ve y si se está reproduciendo.
 */

export type PlaybackStatus = "idle" | "playing" | "paused" | "ended";

export const PLAYBACK_SPEEDS = [0.5, 1, 1.5] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface PlaybackState {
  index: number;
  stepCount: number;
  status: PlaybackStatus;
  speed: PlaybackSpeed;
  autoAdvance: boolean;
  /** Se completó el último paso al menos una vez. */
  finished: boolean;
  /** Cambia cada vez que hay que (re)arrancar la animación. */
  playToken: number;
}

export type PlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "complete" }
  | { type: "seek"; atEnd: boolean }
  | { type: "goto"; index: number; autoplay: boolean; reducedMotion: boolean }
  | { type: "setSpeed"; speed: PlaybackSpeed }
  | { type: "setAutoAdvance"; value: boolean };

export function createPlaybackState(stepCount: number, initialIndex = 0): PlaybackState {
  return {
    index: clampIndex(initialIndex, stepCount),
    stepCount,
    status: "idle",
    speed: 1,
    autoAdvance: false,
    finished: false,
    playToken: 0,
  };
}

export function clampIndex(index: number, stepCount: number): number {
  return Math.min(Math.max(0, Math.trunc(index)), Math.max(0, stepCount - 1));
}

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case "play":
      return { ...state, status: "playing", playToken: state.playToken + 1 };

    case "pause":
      return state.status === "playing" ? { ...state, status: "paused" } : state;

    case "complete": {
      const isLast = state.index === state.stepCount - 1;
      return { ...state, status: "ended", finished: state.finished || isLast };
    }

    case "seek":
      return { ...state, status: action.atEnd ? "ended" : "paused" };

    case "goto": {
      const index = clampIndex(action.index, state.stepCount);
      if (action.autoplay) {
        return { ...state, index, status: "playing", playToken: state.playToken + 1 };
      }
      return { ...state, index, status: action.reducedMotion ? "ended" : "paused" };
    }

    case "setSpeed":
      return state.speed === action.speed ? state : { ...state, speed: action.speed };

    case "setAutoAdvance":
      return { ...state, autoAdvance: action.value };

    default:
      return state;
  }
}
