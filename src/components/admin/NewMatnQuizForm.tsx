"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import { createMatnQuiz } from "@/actions/matn-actions";

export default function NewMatnQuizForm({ matnId }: { matnId: string }) {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createMatnQuiz({ matnId, question, correctAnswer });
      if (result.ok) {
        notify(t("تمت إضافة السؤال", "Question added"), "success");
        setQuestion("");
        setCorrectAnswer("");
        setOpen(false);
      } else {
        notify(result.error, "error");
      }
    });
  };

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <Plus size={14} />
          {t("إضافة سؤال تسميع", "Add a recitation question")}
        </button>
      ) : (
        <form
          onSubmit={submit}
          className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60"
        >
          <label htmlFor={`quiz-question-${matnId}`} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("السؤال/المقطع", "Question / passage")}
          </label>
          <input
            id={`quiz-question-${matnId}`}
            required
            minLength={3}
            maxLength={500}
            value={question}
            disabled={isPending}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("مثال: ما القاعدة الثانية؟", "e.g. What is the second rule?")}
            className="admin-input"
          />
          <label htmlFor={`quiz-answer-${matnId}`} className="mb-1 mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("النص الصحيح", "Correct text")}
          </label>
          <textarea
            id={`quiz-answer-${matnId}`}
            required
            rows={3}
            maxLength={4000}
            value={correctAnswer}
            disabled={isPending}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder={t("النص الدقيق المطلوب حفظه", "The exact text to memorize")}
            className="admin-input"
          />
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={isPending} className="admin-button w-auto px-5 disabled:opacity-50">
              {isPending ? t("جارٍ الحفظ...", "Saving...") : t("حفظ السؤال", "Save question")}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400"
            >
              {t("إلغاء", "Cancel")}
            </button>
          </div>
        </form>
      )}
      <SirajDialog {...dialog} />
    </div>
  );
}
