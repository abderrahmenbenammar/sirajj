"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import MatnQuizForm from "@/components/MatnQuizForm";

export type MatnQuizItem = {
  id: string;
  question: string;
  correctAnswer: string;
};

export default function MatnQuizTaker({ quizzes }: { quizzes: MatnQuizItem[] }) {
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = quizzes.find((quiz) => quiz.id === selectedId) ?? null;

  // Close on Escape + lock body scroll while the modal is open.
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  if (quizzes.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/60 bg-white p-10 text-center dark:border-gray-800/60 dark:bg-gray-900">
        <HelpCircle size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
        <p className="mt-3 font-bold text-gray-900 dark:text-white">
          {t("لا توجد أسئلة بعد", "No questions yet")}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("سيضيف المشرف أسئلة التسميع لهذا المتن قريبًا", "Recitation questions for this matn are coming soon")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {quizzes.map((quiz, index) => (
          <button
            key={quiz.id}
            type="button"
            onClick={() => setSelectedId(quiz.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 text-start transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-gray-800/60 dark:bg-gray-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">
                {quiz.question}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {t("اضغط لبدء التسميع", "Tap to start reciting")}
              </span>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          onClick={() => setSelectedId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selected.question}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-gray-50 p-4 dark:bg-gray-950 sm:rounded-3xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label={t("إغلاق", "Close")}
                className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>
            <MatnQuizForm questions={quizzes} />
          </div>
        </div>
      )}
    </div>
  );
}
