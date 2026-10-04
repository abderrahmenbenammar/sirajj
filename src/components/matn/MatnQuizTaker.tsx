"use client";

import { HelpCircle } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import MatnQuizForm from "@/components/MatnQuizForm";

export type MatnQuizItem = {
  id: string;
  question: string;
  correctAnswer: string;
  type?: string | null;
  options?: unknown;
};

export default function MatnQuizTaker({
  title,
  quizzes,
}: {
  title?: string;
  quizzes: MatnQuizItem[];
}) {
  const { t } = useLang();

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

  // No stacked question list: the flow starts from the welcome screen and
  // advances one card at a time inside MatnQuizForm.
  return <MatnQuizForm title={title} questions={quizzes} />;
}
