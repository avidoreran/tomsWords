import { useEffect, useMemo, useState } from "react";
import { SHEET_WORDS as WORDS } from "./content/sheetWords";
import { GAME_SETTINGS } from "./gameConfig";
import {
  createEmptyProgress,
  getActiveWords,
  getMasteredCount,
  pickDisplayedCorrectAnswer,
  getTotalStars,
  getWordProgress,
  pickNextWord,
  shuffleChoices,
} from "./gameUtils";
import { loadProgress, resetProgress, saveProgress } from "./storage";
import type { FeedbackState, QuestionOption, StoredProgress, WordEntry } from "./types";

const buildRound = (word: WordEntry | null) =>
  word
    ? (() => {
        const displayedCorrectAnswer = pickDisplayedCorrectAnswer(word);
        return {
          word,
          displayedCorrectAnswer,
          options: shuffleChoices(word, displayedCorrectAnswer),
        };
      })()
    : null;

const feedbackCopy = {
  correct: [
    { title: "כל הכבוד!", message: "בחרת נכון. עוד צעד קטן בדרך לאוצר המילים." },
    { title: "אלוף!", message: "המילה הזאת כבר מרגישה לך מוכרת." },
    { title: "נהדר!", message: "ענית נכון וזכית בכוכב נוסף." },
  ],
  retry: [
    { title: "כמעט!", message: "לא נורא. נסה שוב ובחר תשובה אחרת." },
    { title: "עוד רגע!", message: "יש לך עוד הזדמנות אחת." },
    { title: "ממשיכים!", message: "קח נשימה קטנה ונסה שוב." },
  ],
  reveal: [
    {
      title: "לומדים וממשיכים",
      message: "הפעם לא, אבל עכשיו כבר יודעים את התשובה הנכונה.",
    },
    {
      title: "ננסה שוב בהמשך",
      message: "זה בסדר לטעות. המילה הזאת תחזור שוב למשחק.",
    },
  ],
} as const;

const randomFeedback = (type: keyof typeof feedbackCopy) =>
  feedbackCopy[type][Math.floor(Math.random() * feedbackCopy[type].length)];

const pickPracticeWord = (words: WordEntry[]) =>
  words[Math.floor(Math.random() * words.length)] ?? null;

function App() {
  const initialProgress = loadProgress();
  const [progress, setProgress] = useState<StoredProgress>(initialProgress);
  const [practiceMode, setPracticeMode] = useState(false);
  const [round, setRound] = useState(() =>
    buildRound(pickNextWord(WORDS, initialProgress)),
  );
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [disabledOptionIds, setDisabledOptionIds] = useState<string[]>([]);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const totalWords = WORDS.length;
  const activeWords = useMemo(() => getActiveWords(WORDS, progress), [progress]);
  const masteredCount = useMemo(() => getMasteredCount(WORDS, progress), [progress]);
  const totalStars = useMemo(() => getTotalStars(WORDS, progress), [progress]);
  const maxStars = totalWords * GAME_SETTINGS.masteryThreshold;
  const progressPercent = Math.round((masteredCount / totalWords) * 100);
  const currentProgress = round ? getWordProgress(progress, round.word.id) : null;

  const moveToNextRound = (nextProgress: StoredProgress, nextPracticeMode = practiceMode) => {
    const nextWord = nextPracticeMode
      ? pickPracticeWord(WORDS)
      : pickNextWord(WORDS, nextProgress);
    setRound(buildRound(nextWord));
    setAttempts(0);
    setFeedback(null);
    setDisabledOptionIds([]);
  };

  const applyWordUpdate = (
    wordId: string,
    updater: (current: ReturnType<typeof getWordProgress>) => ReturnType<typeof getWordProgress>,
  ) => {
    setProgress((current) => {
      const next = {
        ...current,
        words: {
          ...current.words,
          [wordId]: updater(getWordProgress(current, wordId)),
        },
      };
      return next;
    });
  };

  const handleAnswer = (option: QuestionOption) => {
    if (!round || feedback) {
      return;
    }

    const { word } = round;
    if (option.isCorrect) {
      const response = randomFeedback("correct");
      setProgress((current) => {
        const previous = getWordProgress(current, word.id);
        return {
          ...current,
          words: {
            ...current.words,
            [word.id]: {
              correctCount: previous.correctCount + 1,
              seenCount: previous.seenCount + 1,
              lastResult: "correct",
            },
          },
        };
      });
      setFeedback({ type: "correct", ...response });
      return;
    }

    if (attempts === 0) {
      const response = randomFeedback("retry");
      applyWordUpdate(word.id, (previous) => ({
        ...previous,
        seenCount: previous.seenCount + 1,
        lastResult: "wrong",
      }));
      setAttempts(1);
      setDisabledOptionIds((current) => [...current, option.id]);
      setFeedback({ type: "retry", ...response });
      return;
    }

    const response = randomFeedback("reveal");
    setProgress((current) => {
      const previous = getWordProgress(current, word.id);
      return {
        ...current,
        words: {
          ...current.words,
          [word.id]: {
            ...previous,
            seenCount: Math.max(previous.seenCount, previous.seenCount + 1),
            lastResult: "revealed",
          },
        },
      };
    });
      setFeedback({
      type: "reveal",
      correctAnswer: round.displayedCorrectAnswer,
      ...response,
    });
  };

  const handleContinue = () => {
    setFeedback(null);
    moveToNextRound(progress);
  };

  const handlePlayNow = () => {
    setPracticeMode(true);
    moveToNextRound(progress, true);
  };

  const handleReset = () => {
    const empty = createEmptyProgress();
    resetProgress();
    setProgress(empty);
    setPracticeMode(false);
    setRound(buildRound(pickNextWord(WORDS, empty)));
    setAttempts(0);
    setFeedback(null);
    setDisabledOptionIds([]);
  };

  const correctOptionId = round?.options.find((option) => option.isCorrect)?.id;

  const heroMessage = practiceMode
    ? "מצב אימון פתוח. עכשיו אפשר לשחק גם במילים שכבר למדת."
    : activeWords.length
      ? "בחר את הפירוש הנכון, אסוף כוכבים והפוך כל מילה למוכרת."
      : "סיימת את כל המילים. אפשר לחגוג ואז להתחיל סיבוב חדש.";

  return (
    <div className="app-shell">
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />
      <div className="bg-orb orb-c" />

      <main className="game-frame">
        <section className="hero-card">
          <div>
            <p className="eyebrow">הרפתקת המילים של {GAME_SETTINGS.childName}</p>
            <h1>מגלים מילים חדשות בעברית</h1>
            <p className="hero-copy">{heroMessage}</p>
          </div>

          <div className="score-strip" aria-label="סיכום התקדמות">
            <div className="score-pill">
              <span className="score-label">כוכבים</span>
              <strong>
                {totalStars} / {maxStars}
              </strong>
            </div>
            <div className="score-pill">
              <span className="score-label">מילים שנלמדו</span>
              <strong>
                {masteredCount} / {totalWords}
              </strong>
            </div>
          </div>
        </section>

        <section className="progress-card" aria-label="התקדמות">
          <div className="progress-header">
            <span>המסע שלך</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="progress-caption">
            {practiceMode
              ? "כל המילים פתוחות לאימון חופשי."
              : `נשארו עוד ${activeWords.length} מילים בדרך לכתר המילים.`}
          </p>
        </section>

        {round ? (
          <section className="question-card">
            <div className="question-topline">
              <span>מה פירוש המילה?</span>
              <span className="mini-badge">
                {practiceMode
                  ? "מצב אימון"
                  : `${currentProgress?.correctCount ?? 0}/${GAME_SETTINGS.masteryThreshold} כוכבים למילה`}
              </span>
            </div>

            <div className="word-panel">
              <p className="word-label">המילה של הסבב</p>
              <h2>{round.word.word}</h2>
              {round.word.hint ? <p className="hint">{round.word.hint}</p> : null}
            </div>

            <div className="answers-grid">
              {round.options.map((option) => {
                const isDisabled = disabledOptionIds.includes(option.id);
                const showRevealState = feedback?.type === "reveal";
                const isCorrectReveal = showRevealState && option.id === correctOptionId;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={[
                      "answer-button",
                      isDisabled ? "answer-disabled" : "",
                      isCorrectReveal ? "answer-correct" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={isDisabled || Boolean(feedback && feedback.type !== "retry")}
                    onClick={() => handleAnswer(option)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {feedback ? (
              <div
                className={[
                  "feedback-panel",
                  feedback.type === "correct"
                    ? "feedback-correct"
                    : feedback.type === "reveal"
                      ? "feedback-reveal"
                      : "feedback-retry",
                ].join(" ")}
              >
                <div>
                  <h3>{feedback.title}</h3>
                  <p>{feedback.message}</p>
                  {feedback.type === "reveal" ? (
                    <p className="correct-answer-line">
                      התשובה הנכונה: <strong>{feedback.correctAnswer}</strong>
                    </p>
                  ) : null}
                </div>

                {feedback.type === "retry" ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setFeedback(null)}
                  >
                    לנסות שוב
                  </button>
                ) : (
                  <button type="button" className="primary-button" onClick={handleContinue}>
                    למילה הבאה
                  </button>
                )}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="completion-card">
            <p className="eyebrow">כל הכבוד</p>
            <h2>סיימת את כל המילים במסע הזה</h2>
            <p>
              אספת <strong>{totalStars}</strong> כוכבים ולמדת את כל {totalWords} המילים.
            </p>
            <div className="completion-actions">
              <button type="button" className="primary-button" onClick={handlePlayNow}>
                לשחק שוב
              </button>
              <button type="button" className="ghost-button" onClick={handleReset}>
                לאפס התקדמות
              </button>
            </div>
          </section>
        )}

        <footer className="footer-row">
          <button type="button" className="ghost-button" onClick={handleReset}>
            איפוס כל ההתקדמות
          </button>
          <span>המילים נשמרות בדפדפן במכשיר הזה.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
