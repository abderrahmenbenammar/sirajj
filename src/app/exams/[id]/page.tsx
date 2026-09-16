"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  type SubmitResponse,
  type TakeQuestion,
} from "@/lib/exams-api";
import { CheckCircle2, XCircle, ClipboardList, ArrowLeft, ArrowRight } from "lucide-react";
import SirajLoading from "@/components/ui/SirajLoading";

interface ExamDetail {
  id: string;
  courseId: string;
  courseTitleAr: string;
  courseTitleEn: string;
  titleAr: string;
  titleEn: string;
  passingScorePercentage: number;
  maxAttempts: number;
  questionCount: number;
  totalPoints: number;
  available: boolean;
  attemptsUsed: number;
  attemptsLeft: number;
  inProgressAttemptId: string | null;
  lastResult: { scorePercentage: number; passed: boolean; attemptNumber: number } | null;
  history: { attemptId: string; attemptNumber: number; score: number; scorePercentage: number; passed: boolean; submittedAt: string | null }[];
}

interface ReviewItem {
  questionId: string;
  questionTextAr: string;
  questionTextEn: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

type Phase = "loading" | "detail" | "taking" | "result" | "error";

export default function ExamTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLang();
  const [phase, setPhase] = useState<Phase>("loading");
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [questions, setQuestions] = useState<TakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/exams/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error(`detail-${response.status}`);
        return response.json();
      })
      .then((data: ExamDetail) => {
        setDetail(data);
        setPhase("detail");
      })
      .catch(() => {
        setError(t("الاختبار غير موجود", "Exam not found"));
        setPhase("error");
      });
  }, [id, t]);

  const begin = async () => {
    setBusy(true);
    setError("");
    try {
      const started = await startAttempt(id);
      setAttemptId(started.attempt.id);
      setQuestions(started.questions);
      setAnswers(started.answers);
      setPhase("taking");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("تعذر بدء الاختبار", "Could not start the exam"));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (questionId: string, optionId: string) => {
    const previous = answers[questionId];
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    try {
      await saveAnswer(attemptId, questionId, optionId);
    } catch {
      setAnswers((prev) => {
        const next = { ...prev };
        if (previous === undefined) delete next[questionId];
        else next[questionId] = previous;
        return next;
      });
      setError(t("تعذر حفظ الإجابة", "Could not save the answer"));
    }
  };

  const submit = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const submitted = await submitAttempt(attemptId);
      setResult(submitted);
      const reviewResponse = await fetch(`/api/attempts/${attemptId}`);
      if (reviewResponse.ok) {
        const data: { review?: ReviewItem[] } = await reviewResponse.json();
        setReview(Array.isArray(data.review) ? data.review : []);
      }
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("تعذر إرسال الاختبار", "Could not submit the exam"));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (phase === "loading") {
    return <SirajLoading />;
  }

  if (phase === "error" || !detail) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{error || t("الاختبار غير موجود", "Exam not found")}</h1>
        <Link href="/exams" className="text-emerald-700 dark:text-emerald-400 hover:underline">
          {t("العودة للاختبارات", "Back to exams")}
        </Link>
      </div>
    );
  }

  if (phase === "result" && result) {
    const answered = Object.keys(answers).length;
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 sm:p-10 text-center">
            {result.passed ? (
              <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4" />
            ) : (
              <XCircle size={56} className="text-amber-500 mx-auto mb-4" />
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {result.passed ? t("ناجح! أحسنت", "Passed! Well done") : t("لم توفق هذه المرة", "Not passed this time")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{t(detail.titleAr, detail.titleEn)}</p>
            <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">{result.scorePercentage}%</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              {t("الدرجة", "Score")}: {result.score} / {result.totalPoints} · {t("الصحيحة", "Correct")}: {result.correctCount} ·{" "}
              {t("المحاولة", "Attempt")} {result.attemptNumber} · {t("المتبقي", "Left")}: {result.attemptsLeft}
              {result.alreadySubmitted && ` · ${t("(نتيجة محفوظة مسبقًا)", "(previously saved)")}`}
            </p>
            {review.length > 0 && (
              <div className="text-start space-y-2 mb-8">
                {review.map((item) => (
                  <div
                    key={item.questionId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm"
                  >
                    {item.isCorrect ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-amber-500 shrink-0" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">{t(item.questionTextAr, item.questionTextEn)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {result.attemptsLeft > 0 && (
                <button
                  onClick={() => {
                    setResult(null);
                    setReview([]);
                    setConfirming(false);
                    setPhase("detail");
                  }}
                  className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors"
                >
                  {t("محاولة جديدة", "Try again")}
                </button>
              )}
              <Link
                href="/exams"
                className="px-6 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 transition-colors"
              >
                {t("كل الاختبارات", "All exams")}
              </Link>
            </div>
            <p className="mt-6 text-xs text-gray-400">answered: {answered}</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "taking") {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t(detail.titleAr, detail.titleEn)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {t("أجبت عن", "Answered")} {answeredCount} / {questions.length}
          </p>
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {index + 1}. {t(question.questionTextAr, question.questionTextEn)}
                  <span className="ms-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                    ({question.points} {t("نقطة", "pt")})
                  </span>
                </h2>
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        answers[question.id] === option.id
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === option.id}
                        onChange={() => choose(question.id, option.id)}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t(option.optionTextAr, option.optionTextEn)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={busy}
            className="mt-8 w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {confirming ? t("تأكيد الإرسال؟ اضغط مجددًا", "Confirm submit? Press again") : t("إرسال الاختبار", "Submit exam")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/exams" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            {t("الاختبارات", "Exams")}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t(detail.titleAr, detail.titleEn)}</span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-2">{t(detail.courseTitleAr, detail.courseTitleEn)}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t(detail.titleAr, detail.titleEn)}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <span>{t("الأسئلة", "Questions")}: {detail.questionCount}</span>
            <span>{t("العلامة الكاملة", "Total mark")}: {detail.totalPoints}</span>
            <span>{t("النجاح من", "Pass at")}: {detail.passingScorePercentage}%</span>
            <span>{t("المحاولات المستخدمة", "Used")}: {detail.attemptsUsed} / {detail.maxAttempts}</span>
            {detail.lastResult && (
              <span>
                {t("آخر نتيجة", "Last")}: {detail.lastResult.scorePercentage}% (
                {detail.lastResult.passed ? t("ناجح", "Passed") : t("راسب", "Failed")})
              </span>
            )}
          </div>
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!detail.available ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("هذا الاختبار غير متاح حاليًا", "This exam is currently unavailable")}</p>
          ) : detail.attemptsLeft <= 0 && !detail.inProgressAttemptId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("استنفدت جميع محاولاتك في هذا الاختبار", "You have used all attempts for this exam")}</p>
          ) : (
            <button
              onClick={begin}
              disabled={busy}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              {detail.inProgressAttemptId ? t("متابعة المحاولة", "Resume attempt") : t("ابدأ الاختبار", "Start exam")}
              {lang === "ar" ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
            </button>
          )}
          {detail.history.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">{t("محاولاتك", "Your attempts")}</h2>
              <div className="space-y-2">
                {detail.history.map((item) => (
                  <div key={item.attemptId} className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t("محاولة", "Attempt")} {item.attemptNumber} · {item.score} / {detail.totalPoints}
                    </span>
                    <span className={item.passed ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                      {item.scorePercentage}% · {item.passed ? t("ناجح", "Passed") : t("راسب", "Failed")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
