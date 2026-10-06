"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import {
  isMatnQuizType,
  MATN_QUIZ_TYPES,
  optionsToText,
  parseOptionsText,
} from "@/components/admin/QuizTypeFields";
import { saveMatnQuizzes } from "@/actions/matn-actions";
import type { MatnQuizType } from "@/actions/matn-actions";

type DraftQuestion = {
  uid: string;
  question: string;
  type: MatnQuizType;
  answer: string;
  optionsText: string;
};

const COUNT_OPTIONS = [4, 6, 8, 12, 16];
const MIN_TEXT_LENGTH = 50;
const TYPE_OPTIONS: { value: MatnQuizType; ar: string; en: string }[] = [
  { value: "write", ar: "كتابة حرة", en: "Free writing" },
  { value: "reorder", ar: "ترتيب الكلمات", en: "Word reorder" },
  { value: "fill_blank", ar: "إكمال الفراغات", en: "Fill in the blanks" },
  { value: "mcq", ar: "اختيار من متعدد", en: "Multiple choice" },
];

type Mode = "generate" | "save" | null;

/**
 * AI auto-generation panel: paste the full Matn text, Gemini returns a
 * balanced set of interactive questions, the admin reviews/edits the preview,
 * then saves everything into MatnQuiz (idempotent — re-saves skip duplicates).
 */
export default function GenerateMatnQuizzes({ matnId, initialText }: { matnId: string; initialText?: string }) {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [open, setOpen] = useState(false);
  const [fullText, setFullText] = useState(initialText ?? "");
  const [count, setCount] = useState(8);
  const [selectedTypes, setSelectedTypes] = useState<MatnQuizType[]>([...MATN_QUIZ_TYPES]);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    if (fullText.trim().length < MIN_TEXT_LENGTH || selectedTypes.length === 0 || isPending) return;
    setMode("generate");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/generate-matn-quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matnId, fullText, questionCount: count, selectedTypes }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          notify(
            typeof data?.error === "string"
              ? data.error
              : t("تعذر توليد الأسئلة، حاول مجددًا", "Could not generate questions, try again"),
            "error",
          );
          return;
        }
        const items: unknown[] = Array.isArray(data?.questions) ? data.questions : [];
        const next: DraftQuestion[] = [];
        for (const raw of items) {
          const q = raw as { question?: unknown; type?: unknown; answer?: unknown; options?: unknown };
          const question = typeof q.question === "string" ? q.question.trim() : "";
          const answer = typeof q.answer === "string" ? q.answer.trim() : "";
          if (!question || !answer) continue;
          next.push({
            uid: crypto.randomUUID(),
            question,
            type: isMatnQuizType(q.type) ? q.type : "write",
            answer,
            optionsText: Array.isArray(q.options) ? optionsToText(q.options) : "",
          });
        }
        if (next.length === 0) {
          notify(
            t("لم يُرجع النموذج أسئلة صالحة، حاول مجددًا", "The model returned no valid questions, try again"),
            "error",
          );
          return;
        }
        setDrafts(next);
      } catch {
        notify(t("تعذر الاتصال بالخادم", "Could not reach the server"), "error");
      } finally {
        setMode(null);
      }
    });
  };

  const saveAll = () => {
    if (drafts.length === 0 || isPending) return;
    setMode("save");
    startTransition(async () => {
      try {
        const result = await saveMatnQuizzes({
          matnId,
          questions: drafts.map((draft) => ({
            question: draft.question,
            correctAnswer: draft.answer,
            type: draft.type,
            options: draft.type === "mcq" ? parseOptionsText(draft.optionsText) : undefined,
          })),
        });
        if (!result.ok) {
          notify(result.error, "error");
          return;
        }
        notify(
          result.skipped > 0
            ? t(
                `تم حفظ ${result.created} سؤالًا (تم تجاهل ${result.skipped} مكررًا)`,
                `Saved ${result.created} questions (${result.skipped} duplicates skipped)`,
              )
            : t(`تم حفظ ${result.created} سؤالًا`, `Saved ${result.created} questions`),
          "success",
        );
        setDrafts([]);
        setFullText("");
        setOpen(false);
      } finally {
        setMode(null);
      }
    });
  };

  const updateDraft = (uid: string, patch: Partial<DraftQuestion>) => {
    setDrafts((prev) => prev.map((draft) => (draft.uid === uid ? { ...draft, ...patch } : draft)));
  };

  const removeDraft = (uid: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.uid !== uid));
  };

  const changeType = (draft: DraftQuestion, type: MatnQuizType) => {
    // Seed the option list with the correct answer so mcq saves stay valid.
    const patch: Partial<DraftQuestion> = { type };
    if (type === "mcq" && !draft.optionsText.trim()) patch.optionsText = draft.answer;
    updateDraft(draft.uid, patch);
  };

  return (
    <div className="mt-4">
      <SirajDialog {...dialog} />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          <Wand2 size={14} />
          {t("إنشاء الأسئلة تلقائيًا بالذكاء الاصطناعي 🪄", "Auto-generate questions with AI 🪄")}
        </button>
      ) : (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
          <p className="flex items-center gap-1.5 text-sm font-bold text-violet-800 dark:text-violet-300">
            <Sparkles size={15} className="shrink-0" />
            {t("إنشاء الأسئلة تلقائيًا بالذكاء الاصطناعي 🪄", "Auto-generate questions with AI 🪄")}
          </p>

          <label htmlFor={`ai-fulltext-${matnId}`} className="mb-1 mt-3 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("نص المتن كاملًا", "Full matn text")}
          </label>
          <textarea
            id={`ai-fulltext-${matnId}`}
            rows={6}
            maxLength={20000}
            value={fullText}
            disabled={isPending}
            onChange={(event) => setFullText(event.target.value)}
            placeholder={t(
              "الصق نص المتن أو الفصل كاملًا هنا، وسيقوم الذكاء الاصطناعي بتحليله واستخراج أسئلة تفاعلية متوازنة...",
              "Paste the full matn or chapter text here and the AI will analyze it and extract a balanced set of interactive questions...",
            )}
            className="admin-input"
          />

          <fieldset disabled={isPending} className="mt-3">
            <legend className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("أنواع الأسئلة المطلوبة", "Question types to include")}
            </legend>
            <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-900 dark:bg-gray-900 dark:text-violet-300">
              <input
                type="checkbox"
                checked={selectedTypes.length === MATN_QUIZ_TYPES.length}
                onChange={(event) =>
                  setSelectedTypes(event.target.checked ? [...MATN_QUIZ_TYPES] : [])
                }
                className="h-4 w-4 accent-violet-600"
              />
              {t("تحديد جميع الأنواع", "Select all types")}
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(option.value)}
                    onChange={(event) =>
                      setSelectedTypes((current) =>
                        event.target.checked
                          ? [...current, option.value]
                          : current.filter((type) => type !== option.value),
                      )
                    }
                    className="h-4 w-4 accent-violet-600"
                  />
                  {t(option.ar, option.en)}
                </label>
              ))}
            </div>
            {selectedTypes.length === 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                {t("اختر نوعًا واحدًا على الأقل.", "Select at least one question type.")}
              </p>
            )}
          </fieldset>

          <div className="mt-2 flex items-center gap-2">
            <label htmlFor={`ai-count-${matnId}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("عدد الأسئلة", "Question count")}
            </label>
            <select
              id={`ai-count-${matnId}`}
              value={count}
              disabled={isPending}
              onChange={(event) => setCount(Number(event.target.value))}
              className="admin-input w-auto py-1.5"
            >
              {COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {mode === "generate" && isPending && (
            <div
              role="status"
              className="mt-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900"
            >
              <Loader2 size={16} className="shrink-0 animate-spin text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t(
                  "جارٍ تحليل المتن وإنشاء الأسئلة التفاعلية...",
                  "Analyzing the matn and creating interactive questions...",
                )}
              </span>
            </div>
          )}

          {mode === "save" && isPending && (
            <div
              role="status"
              className="mt-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-gray-900"
            >
              <Loader2 size={16} className="shrink-0 animate-spin text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("جارٍ حفظ الأسئلة...", "Saving questions...")}
              </span>
            </div>
          )}

          {drafts.length > 0 && !isPending && (
            <div className="mt-3">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {t(`معاينة الأسئلة (${drafts.length}) — عدّل أو احذف قبل الحفظ:`, `Question preview (${drafts.length}) — edit or delete before saving:`)}
              </p>
              <ol className="mt-2 space-y-3">
                {drafts.map((draft, index) => (
                  <li
                    key={draft.uid}
                    className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-extrabold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        {index + 1}
                      </span>
                      <select
                        aria-label={t("نوع السؤال", "Question type")}
                        value={draft.type}
                        onChange={(event) => changeType(draft, event.target.value as MatnQuizType)}
                        className="admin-input w-auto py-1 text-xs"
                      >
                        <option value="write">{t("كتابة حرية", "Free writing")}</option>
                        <option value="reorder">{t("ترتيب الكلمات", "Word reorder")}</option>
                        <option value="fill_blank">{t("كلمات ناقصة", "Fill in the blanks")}</option>
                        <option value="mcq">{t("اختيار من متعدد", "Multiple choice")}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeDraft(draft.uid)}
                        aria-label={t("حذف السؤال", "Delete question")}
                        className="ms-auto p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={draft.question}
                      maxLength={500}
                      onChange={(event) => updateDraft(draft.uid, { question: event.target.value })}
                      placeholder={t("نص السؤال", "Question text")}
                      className="admin-input mt-2"
                    />
                    <textarea
                      rows={2}
                      maxLength={4000}
                      value={draft.answer}
                      onChange={(event) => updateDraft(draft.uid, { answer: event.target.value })}
                      placeholder={t("النص الصحيح", "Correct text")}
                      className="admin-input mt-2"
                    />
                    {draft.type === "mcq" && (
                      <>
                        <textarea
                          rows={4}
                          maxLength={4000}
                          value={draft.optionsText}
                          onChange={(event) => updateDraft(draft.uid, { optionsText: event.target.value })}
                          placeholder={t("الخيارات — خيار واحد في كل سطر", "Options — one per line")}
                          className="admin-input mt-2"
                        />
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {t(
                            "أضف الإجابة الصحيحة ضمن الخيارات (4 خيارات مفضلة).",
                            "Include the correct answer among the options (4 options preferred).",
                          )}
                        </p>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={isPending || fullText.trim().length < MIN_TEXT_LENGTH || selectedTypes.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === "generate" && isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {t("توليد ونشر الأسئلة", "Generate & publish questions")}
            </button>

            {drafts.length > 0 && !isPending && (
              <button
                type="button"
                onClick={saveAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
              >
                <Save size={14} />
                {t(`حفظ الكل في قاعدة البيانات (${drafts.length})`, `Save all to database (${drafts.length})`)}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDrafts([]);
              }}
              disabled={isPending}
              className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 disabled:opacity-50"
            >
              {t("إغلاق", "Close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
