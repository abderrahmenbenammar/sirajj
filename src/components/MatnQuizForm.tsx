"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { GradeMatnResult } from "@/app/api/grade-matn/route";

export interface MatnQuizQuestion {
  question: string;
  correctAnswer: string;
}

interface MatnQuizFormProps {
  questions: MatnQuizQuestion[];
}

type AnswerRecord = {
  text: string;
  score: number;
  feedback: string;
  isPassed: boolean;
};

// Single source of truth for pass/fail (mirrors /api/grade-matn).
const PASS_THRESHOLD = 85;

export default function MatnQuizForm({ questions }: MatnQuizFormProps) {
  const { t } = useLang();
  const totalQuestions = questions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, AnswerRecord>>({});
  const [studentAnswer, setStudentAnswer] = useState("");
  const [result, setResult] = useState<GradeMatnResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus and scroll the textarea into view whenever a new card enters.
  useEffect(() => {
    if (showSummary) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex, showSummary]);

  if (totalQuestions === 0) {
    return (
      <div
        dir="rtl"
        className="w-full max-w-2xl rounded-2xl border border-gray-200/80 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <p className="font-bold text-gray-900 dark:text-white">
          {t("لا توجد أسئلة بعد", "No questions yet")}
        </p>
      </div>
    );
  }

  const current = questions[currentIndex];
  const isGraded = result !== null;
  const isLast = currentIndex === totalQuestions - 1;
  const progressPercent = showSummary
    ? 100
    : ((currentIndex + 1) / totalQuestions) * 100;

  const checkAnswer = () => {
    const text = studentAnswer.trim();
    if (text.length === 0 || isGrading || isGraded) return;
    setIsGrading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/grade-matn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentAnswer: text, correctAnswer: current.correctAnswer }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : t("تعذر التصحيح حاليًا، حاول مجددًا", "Grading failed, try again"),
          );
          return;
        }
        const graded = data as GradeMatnResult;
        const score = Math.min(100, Math.max(0, Math.round(graded.score)));
        const isPassed = score >= PASS_THRESHOLD;
        setUserAnswers((prev) => ({
          ...prev,
          [currentIndex]: { text, score, feedback: graded.feedback, isPassed },
        }));
        setResult({ ...graded, score, isPassed });
      } catch {
        setError(t("تعذر الاتصال بالخادم", "Could not reach the server"));
      } finally {
        setIsGrading(false);
      }
    })();
  };

  const goNext = () => {
    if (isLast) {
      setShowSummary(true);
      return;
    }
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
    setStudentAnswer("");
    setResult(null);
    setError(null);
  };

  const primaryAction = () => {
    if (isGraded) goNext();
    else checkAnswer();
  };

  const restartQuiz = () => {
    setUserAnswers({});
    setCurrentIndex(0);
    setStudentAnswer("");
    setResult(null);
    setError(null);
    setIsGrading(false);
    setShowSummary(false);
  };

  // Ctrl+Enter / Cmd+Enter triggers Check Answer / Next Question from anywhere
  // inside the active card (the textarea is auto-focused on card entry).
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!showSummary) primaryAction();
    }
  };

  const overallScore =
    totalQuestions > 0
      ? Math.round(
          Object.values(userAnswers).reduce((sum, answer) => sum + answer.score, 0) /
            totalQuestions,
        )
      : 0;
  const overallPassed = overallScore >= PASS_THRESHOLD;

  const cardMotion = {
    initial: { opacity: 0, x: 50, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -50, scale: 0.95 },
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  };

  return (
    <div dir="rtl" className="w-full max-w-2xl mx-auto">
      {/* Global progress bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
          <span>
            {showSummary
              ? t("اكتمل الاختبار", "Quiz complete")
              : t(
                  `السؤال ${currentIndex + 1} من ${totalQuestions}`,
                  `Question ${currentIndex + 1} of ${totalQuestions}`,
                )}
          </span>
          <span dir="ltr">{Math.round(progressPercent)}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          aria-label={t("تقدم الاختبار", "Quiz progress")}
          className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        >
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${progressPercent}%`, transition: "width 0.4s ease" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showSummary ? (
          <motion.div
            key="summary"
            {...cardMotion}
            className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-6"
          >
            <div className="flex items-center gap-2">
              {overallPassed ? (
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle size={20} className="shrink-0 text-amber-500 dark:text-amber-400" />
              )}
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("النتيجة النهائية", "Final Result")}
              </h2>
            </div>

            <div
              aria-live="polite"
              className={`mt-4 rounded-xl border p-4 ${
                overallPassed
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-sm font-bold ${
                    overallPassed
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {overallPassed
                    ? t("أحسنت! تم اجتياز الاختبار", "Passed — well done!")
                    : t("تحتاج مراجعة بعض الإجابات", "Some answers need review")}
                </span>
                <span className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                  <span dir="ltr">{overallScore}%</span>
                </span>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {questions.map((question, index) => {
                const answer = userAnswers[index];
                const passed = (answer?.score ?? 0) >= PASS_THRESHOLD;
                return (
                  <li
                    key={question.question + index}
                    className={`flex gap-3 rounded-xl border p-3 ${
                      answer && answer.score < 100
                        ? "border-amber-200/70 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20"
                        : "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                        passed
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                        {question.question}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                        {answer
                          ? t("درجتك: ", "Your score: ") + `${answer.score}%`
                          : t("لم يُجب", "Unanswered")}
                      </p>
                      {answer?.feedback && (
                        <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                          {answer.feedback}
                        </p>
                      )}
                      {answer && answer.score < 100 && (
                        <div className="mt-1.5 rounded-lg border border-emerald-200/70 bg-white p-2 dark:border-gray-700 dark:bg-gray-900/80">
                          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            {t("النص الصحيح للمراجعة:", "Reference correct answer:")}
                          </p>
                          <p className="mt-0.5 text-xs font-medium leading-6 text-gray-900 dark:text-gray-100">
                            {question.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={restartQuiz}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-emerald-800 dark:hover:text-emerald-400"
            >
              <RotateCcw size={16} />
              {t("إعادة الاختبار", "Restart quiz")}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`question-${currentIndex}`}
            {...cardMotion}
            onKeyDown={handleKeyDown}
            className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {currentIndex + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {t("السؤال", "Question")}
                </p>
                <p className="mt-1 text-sm font-medium leading-7 text-gray-900 dark:text-white">
                  {current.question}
                </p>
              </div>
            </div>

            <label
              htmlFor="matn-answer"
              className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("إجابتك", "Your answer")}
            </label>
            <textarea
              id="matn-answer"
              ref={textareaRef}
              value={studentAnswer}
              onChange={(event) => setStudentAnswer(event.target.value)}
              rows={5}
              disabled={isGrading}
              readOnly={isGraded}
              placeholder={t("اكتب المتن هنا...", "Type the matn here...")}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-base leading-8 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            {result && (
              <div
                aria-live="polite"
                className={`mt-4 rounded-xl border p-4 ${
                  result.isPassed
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                    : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.isPassed ? (
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle size={20} className="shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      result.isPassed
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {result.isPassed
                      ? t("أحسنت! تم اجتياز الحفظ", "Passed — well done!")
                      : t("راجع إجابتك وصححها", "Review and correct your answer")}
                  </span>
                  <span className="ms-auto text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                    <span dir="ltr">{result.score}%</span>
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                  {result.feedback}
                </p>

                {result.score < 100 && (
                  <div className="mt-3 rounded-xl border border-emerald-200/70 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {t("النص الصحيح للمراجعة:", "Reference correct answer:")}
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-8 text-gray-900 dark:text-gray-100">
                      {current.correctAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={primaryAction}
              disabled={isGrading || (!isGraded && studentAnswer.trim().length === 0)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGrading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("جارٍ التصحيح...", "Grading...")}
                </>
              ) : isGraded ? (
                isLast ? (
                  t("عرض النتيجة النهائية 🎯", "Show Final Result 🎯")
                ) : (
                  <>
                    <ArrowLeft size={16} />
                    {t("السؤال التالي ←", "Next Question →")}
                  </>
                )
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {t("تحقق من الإجابة", "Check Answer")}
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
