"use client";

import { useSyncExternalStore } from "react";
import { EXPERIENCES, type Experience } from "./route-progress";

/**
 * Progreso del alumno guardado en `localStorage` (sin servidor ni cuentas).
 * Se expone con `useSyncExternalStore`: el render de servidor usa un estado
 * vacío y el cliente se sincroniza tras hidratar, sin desajustes.
 */

const STORAGE_KEY = "croche:progress:v1";

export interface LearningProgress {
  version: 1;
  experience: Experience | null;
  mastered: readonly string[];
}

const EMPTY: LearningProgress = Object.freeze({ version: 1, experience: null, mastered: Object.freeze([]) });

let cache: LearningProgress | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): LearningProgress {
  if (!raw || typeof raw !== "object") return EMPTY;
  const value = raw as Partial<Record<keyof LearningProgress, unknown>>;
  const experience = EXPERIENCES.includes(value.experience as Experience) ? (value.experience as Experience) : null;
  const mastered = Array.isArray(value.mastered)
    ? [...new Set(value.mastered.filter((id): id is string => typeof id === "string"))]
    : [];
  return { version: 1, experience, mastered };
}

function readStorage(): LearningProgress {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? sanitize(JSON.parse(stored)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): LearningProgress {
  if (cache === null) cache = readStorage();
  return cache;
}

function getServerSnapshot(): LearningProgress {
  return EMPTY;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: LearningProgress) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Modo privado o cuota llena: el progreso vive solo en memoria.
  }
  emit();
}

export const progressActions = {
  setExperience(experience: Experience) {
    write({ ...getSnapshot(), experience });
  },
  setMastered(techniqueId: string, mastered: boolean) {
    const current = new Set(getSnapshot().mastered);
    if (mastered) current.add(techniqueId);
    else current.delete(techniqueId);
    write({ ...getSnapshot(), mastered: [...current] });
  },
  reset() {
    write(EMPTY);
  },
};

export function useLearningProgress(): LearningProgress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
