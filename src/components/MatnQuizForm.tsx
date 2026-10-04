"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { GradeMatnResult } from "@/app/api/grade-matn/route";

interface MatnQuizFormProps {
  question?: string;
  correctAnswer?: string;
}

const DEFAULT_CORRECT_ANSWER = "أن تعبد الله مخلصا له الدين";

export default function MatnQuizForm({ question, correctAnswer = DEFAULT_CORRECT_ANSWER }: MatnQuizFormProps) {
  const { t } = useLang();
  const [studentAnswer, setStudentAnswer] = useState("");
  const [result, setResult] = useState<GradeMatnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);

  const handleSubmit = () => {
    if (studentAnswer.trim().length === 0) {
      setError(t("اكتب إجابتك أولًا", "Write your answer first"));
      return;
    }
    setIsGrading(true);
    setError(null);
    setResult(null);

    void (async () => {
      try {
        const res = await fetch("/api/grade-matn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentAnswer, correctAnswer }),
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
        setResult(data as GradeMatnResult);
      } catch {
        setError(t("تعذر الاتصال بالخادم", "Could not reach the server"));
      } finally {
        setIsGrading(false);
      }
    })();
  };

  return (
    <div dir="rtl" className="w-full max-w-2xl mx-auto rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        {t("اختبار حفظ المتن", "Matn memorization quiz")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("اكتب المتن من حفظك ثم اضغط تصحيح", "Type the matn from memory, then submit")}
      </p>

      {question && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {t("السؤال", "Question")}
          </p>
          <p className="mt-1 text-sm font-medium leading-7 text-gray-900 dark:text-white">
            {question}
          </p>
        </div>
      )}

      <label
        htmlFor="matn-answer"
        className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {t("إجابتك", "Your answer")}
      </label>
      <textarea
        id="matn-answer"
        value={studentAnswer}
        onChange={(event) => setStudentAnswer(event.target.value)}
        rows={5}
        disabled={isGrading}
        placeholder={t("اكتب المتن هنا...", "Type the matn here...")}
        className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-base leading-8 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isGrading || studentAnswer.trim().length === 0}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGrading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t("جارٍ التصحيح...", "Grading...")}
          </>
        ) : (
          <>
            <Send size={16} />
            {t("تصحيح", "Grade")}
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div
          aria-live="polite"
          className={`mt-5 rounded-xl border p-4 ${
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
                : t("لم يتم الاجتياز بعد، واصل المراجعة", "Not passed yet — keep reviewing")}
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
                {correctAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
