import { GAME_SETTINGS } from "./gameConfig";
import type {
  PlayerWordProgress,
  QuestionOption,
  StoredProgress,
  WordEntry,
} from "./types";

export const getDefaultWordProgress = (): PlayerWordProgress => ({
  correctCount: 0,
  seenCount: 0,
  lastResult: null,
});

export const createEmptyProgress = (): StoredProgress => ({
  version: GAME_SETTINGS.progressVersion,
  words: {},
});

export const getWordProgress = (
  progress: StoredProgress,
  wordId: string,
): PlayerWordProgress => progress.words[wordId] ?? getDefaultWordProgress();

export const isWordMastered = (progress: StoredProgress, wordId: string) =>
  getWordProgress(progress, wordId).correctCount >= GAME_SETTINGS.masteryThreshold;

export const getActiveWords = (words: WordEntry[], progress: StoredProgress) =>
  words.filter((word) => !isWordMastered(progress, word.id));

export const getMasteredCount = (words: WordEntry[], progress: StoredProgress) =>
  words.filter((word) => isWordMastered(progress, word.id)).length;

export const getTotalStars = (words: WordEntry[], progress: StoredProgress) =>
  words.reduce(
    (sum, word) =>
      sum +
      Math.min(
        getWordProgress(progress, word.id).correctCount,
        GAME_SETTINGS.masteryThreshold,
      ),
    0,
  );

export const pickDisplayedCorrectAnswer = (word: WordEntry) =>
  word.correctAnswers[Math.floor(Math.random() * word.correctAnswers.length)];

export const shuffleChoices = (
  word: WordEntry,
  displayedCorrectAnswer: string,
): QuestionOption[] => {
  const allChoices = [displayedCorrectAnswer, ...word.wrongAnswers];
  const options = allChoices.map((label, index) => ({
    id: `${word.id}-${index}`,
    label,
    isCorrect: label === displayedCorrectAnswer,
  }));

  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

export const pickNextWord = (words: WordEntry[], progress: StoredProgress) => {
  const activeWords = getActiveWords(words, progress);
  if (activeWords.length === 0) {
    return null;
  }

  const sorted = [...activeWords].sort((left, right) => {
    const leftProgress = getWordProgress(progress, left.id);
    const rightProgress = getWordProgress(progress, right.id);

    if (leftProgress.correctCount !== rightProgress.correctCount) {
      return leftProgress.correctCount - rightProgress.correctCount;
    }

    return leftProgress.seenCount - rightProgress.seenCount;
  });

  const lowestScore = getWordProgress(progress, sorted[0].id).correctCount;
  const candidates = sorted.filter(
    (word) => getWordProgress(progress, word.id).correctCount === lowestScore,
  );

  return candidates[Math.floor(Math.random() * candidates.length)];
};
