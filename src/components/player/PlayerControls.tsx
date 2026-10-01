"use client";

import { Gauge, Pause, Play, Repeat, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { cx } from "@/lib/cx";
import { PLAYBACK_SPEEDS, type PlaybackSpeed, type PlaybackStatus } from "./playback";

interface PlayerControlsProps {
  status: PlaybackStatus;
  isFirst: boolean;
  isLast: boolean;
  speed: PlaybackSpeed;
  autoAdvance: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onAutoAdvanceChange: (value: boolean) => void;
}

const ghostButton =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink transition hover:bg-surface-muted active:scale-95 disabled:pointer-events-none disabled:opacity-35";

export function PlayerControls({
  status,
  isFirst,
  isLast,
  speed,
  autoAdvance,
  onPrev,
  onNext,
  onToggle,
  onSpeedChange,
  onAutoAdvanceChange,
}: PlayerControlsProps) {
  const isPlaying = status === "playing";
  const isEnded = status === "ended";
  const playLabel = isPlaying ? "Pausar animación" : isEnded ? "Repetir paso" : "Reproducir animación";
  const PlayIcon = isPlaying ? Pause : isEnded ? RotateCcw : Play;

  const nextSpeed = () => {
    const index = PLAYBACK_SPEEDS.indexOf(speed);
    onSpeedChange(PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length]);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <button type="button" className={ghostButton} onClick={onPrev} disabled={isFirst} aria-label="Paso anterior">
          <SkipBack className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">Anterior</span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={playLabel}
          title={`${playLabel} (barra espaciadora)`}
          className="inline-flex size-14 items-center justify-center rounded-full bg-terracotta-500 text-white shadow-lg shadow-terracotta-500/30 transition hover:bg-terracotta-600 active:scale-95"
        >
          <PlayIcon className={cx("size-6", !isPlaying && !isEnded && "translate-x-0.5")} aria-hidden="true" fill={isPlaying || isEnded ? "none" : "currentColor"} />
        </button>
        <button type="button" className={ghostButton} onClick={onNext} disabled={isLast} aria-label="Siguiente paso">
          <span className="hidden sm:inline">Siguiente</span>
          <SkipForward className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={nextSpeed}
          className={cx(ghostButton, "px-2.5 font-mono tabular-nums")}
          aria-label={`Velocidad ${speed}×. Cambiar velocidad`}
          title="Velocidad de la animación"
        >
          <Gauge className="size-4" aria-hidden="true" />
          {speed}×
        </button>
        <button
          type="button"
          onClick={() => onAutoAdvanceChange(!autoAdvance)}
          aria-pressed={autoAdvance}
          title="Avanzar solo al siguiente paso"
          className={cx(ghostButton, "px-2.5", autoAdvance && "bg-sage-200 text-sage-800 hover:bg-sage-200")}
        >
          <Repeat className="size-4" aria-hidden="true" />
          <span className="sr-only">Avance automático</span>
        </button>
      </div>
    </div>
  );
}
