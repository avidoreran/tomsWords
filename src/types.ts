export type WordEntry = {
  id: string;
  word: string;
  correctAnswers: string[];
  wrongAnswers: [string, string, string];
  hint?: string;
};

export type PlayerWordProgress = {
  correctCount: number;
  seenCount: number;
  lastResult: "correct" | "revealed" | "wrong" | null;
};

export type StoredProgress = {
  version: number;
  words: Record<string, PlayerWordProgress>;
};

export type QuestionOption = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type FeedbackState =
  | {
      type: "correct";
      title: string;
      message: string;
    }
  | {
      type: "retry";
      title: string;
      message: string;
    }
  | {
      type: "reveal";
      title: string;
      message: string;
      correctAnswer: string;
    };
