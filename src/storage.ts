import { GAME_SETTINGS } from "./gameConfig";
import { createEmptyProgress } from "./gameUtils";
import type { StoredProgress } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const loadProgress = (): StoredProgress => {
  if (typeof window === "undefined") {
    return createEmptyProgress();
  }

  try {
    const raw = window.localStorage.getItem(GAME_SETTINGS.storageKey);
    if (!raw) {
      return createEmptyProgress();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== GAME_SETTINGS.progressVersion) {
      return createEmptyProgress();
    }

    const words = isRecord(parsed.words) ? parsed.words : {};
    return {
      version: GAME_SETTINGS.progressVersion,
      words: Object.fromEntries(
        Object.entries(words).map(([wordId, value]) => {
          const entry = isRecord(value) ? value : {};
          return [
            wordId,
            {
              correctCount:
                typeof entry.correctCount === "number" ? entry.correctCount : 0,
              seenCount: typeof entry.seenCount === "number" ? entry.seenCount : 0,
              lastResult:
                entry.lastResult === "correct" ||
                entry.lastResult === "revealed" ||
                entry.lastResult === "wrong"
                  ? entry.lastResult
                  : null,
            },
          ];
        }),
      ),
    };
  } catch {
    return createEmptyProgress();
  }
};

export const saveProgress = (progress: StoredProgress) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GAME_SETTINGS.storageKey, JSON.stringify(progress));
};

export const resetProgress = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GAME_SETTINGS.storageKey);
};
