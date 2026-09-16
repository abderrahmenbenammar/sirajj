"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { fetchExams, type ExamListItem } from "@/lib/exams-api";
import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import SirajLoading from "@/components/ui/SirajLoading";

export default function ExamsPage() {
  const { t } = useLang();
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchExams()
      .then(setExams)
      .catch(() => setError(t("تعذر تحميل الاختبارات", "Could not load exams")))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t("الاختبارات", "Exams")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t("اختبر معلوماتك وتابع نتائجك", "Test your knowledge and track your results")}
          </p>
        </div>

        {loading ? (
          <SirajLoading />
        ) : error ? (
          <p className="text-center text-red-600 dark:text-red-400 py-16">{error}</p>
        ) : exams.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
            <ClipboardList size={44} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t("لا توجد اختبارات متاحة حاليًا", "No exams available yet")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                href={exam.available || exam.lastResult || exam.inProgressAttemptId ? `/exams/${exam.id}` : "#"}
                aria-disabled={!exam.available && !exam.lastResult && !exam.inProgressAttemptId}
                onClick={(event) => {
                  if (!exam.available && !exam.lastResult && !exam.inProgressAttemptId) event.preventDefault();
                }}
                className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                  <ClipboardList size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                    {t(exam.titleAr, exam.titleEn)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t(exam.courseTitleAr, exam.courseTitleEn)} · {exam.questionCount} {t("أسئلة", "questions")} ·{" "}
                    {t("المحاولات المتبقية", "Attempts left")}: {exam.attemptsLeft}
                  </p>
                </div>
                {exam.lastResult ? (
                  exam.lastResult.passed ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 size={14} /> {exam.lastResult.scorePercentage}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shrink-0">
                      <XCircle size={14} /> {exam.lastResult.scorePercentage}%
                    </span>
                  )
                ) : !exam.available ? (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
                    {t("غير متاح", "Unavailable")}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
