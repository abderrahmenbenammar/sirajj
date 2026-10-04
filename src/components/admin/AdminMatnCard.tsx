"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { HelpCircle, Pencil, Trash2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import SirajDialog, { useSirajConfirm, useSirajMessage } from "@/components/ui/SirajDialog";
import SirajTooltip from "@/components/ui/SirajTooltip";
import NewMatnQuizForm from "@/components/admin/NewMatnQuizForm";
import GenerateMatnQuizzes from "@/components/admin/GenerateMatnQuizzes";
import QuizTypeFields, {
  isMatnQuizType,
  optionsToText,
  parseOptionsText,
} from "@/components/admin/QuizTypeFields";
import { updateMatn, deleteMatn, updateMatnQuiz, deleteMatnQuiz } from "@/actions/matn-actions";
import type { MatnQuizType } from "@/actions/matn-actions";
import type { AdminMatn, AdminMatnQuiz } from "@/components/admin/types";

export default function AdminMatnCard({ matn }: { matn: AdminMatn }) {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const { dialog: confirmDialog, confirm } = useSirajConfirm();

  const [matnEditing, setMatnEditing] = useState(false);
  const [matnTitle, setMatnTitle] = useState(matn.title);
  const [matnDescription, setMatnDescription] = useState(matn.description ?? "");
  const [matnPending, startMatnTransition] = useTransition();

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizType, setQuizType] = useState<MatnQuizType>("write");
  const [quizOptionsText, setQuizOptionsText] = useState("");
  const [quizPending, startQuizTransition] = useTransition();

  const startMatnEdit = () => {
    setMatnTitle(matn.title);
    setMatnDescription(matn.description ?? "");
    setMatnEditing(true);
  };

  const submitMatnEdit = (event: FormEvent) => {
    event.preventDefault();
    startMatnTransition(async () => {
      const result = await updateMatn(matn.id, { title: matnTitle, description: matnDescription });
      if (result.ok) {
        notify(t("تم تحديث المتن", "Matn updated"), "success");
        setMatnEditing(false);
      } else {
        notify(result.error, "error");
      }
    });
  };

  const removeMatn = () => {
    startMatnTransition(async () => {
      const confirmed = await confirm(
        t(
          `سيتم حذف المتن «${matn.title}» مع جميع أسئلة التسميع المرتبطة به (${matn.quizCount}) نهائيًا. لا يمكن التراجع عن هذا الإجراء.`,
          `This will permanently delete "${matn.title}" together with all ${matn.quizCount} of its recitation questions. This cannot be undone.`,
        ),
        {
          type: "warning",
          title: t("حذف المتن", "Delete matn"),
          confirmLabel: t("حذف نهائي", "Delete forever"),
          confirmVariant: "danger",
        },
      );
      if (!confirmed) return;
      const result = await deleteMatn(matn.id);
      if (result.ok) {
        notify(t("تم حذف المتن وأسئلته", "Matn and its questions were deleted"), "success");
      } else {
        notify(result.error, "error");
      }
    });
  };

  const startQuizEdit = (quiz: AdminMatnQuiz) => {
    setQuizQuestion(quiz.question);
    setQuizAnswer(quiz.correctAnswer);
    setQuizType(isMatnQuizType(quiz.type) ? quiz.type : "write");
    setQuizOptionsText(optionsToText(quiz.options));
    setEditingQuizId(quiz.id);
  };

  const submitQuizEdit = (event: FormEvent, quiz: AdminMatnQuiz) => {
    event.preventDefault();
    startQuizTransition(async () => {
      const result = await updateMatnQuiz(quiz.id, {
        question: quizQuestion,
        correctAnswer: quizAnswer,
        type: quizType,
        options: quizType === "mcq" ? parseOptionsText(quizOptionsText) : undefined,
      });
      if (result.ok) {
        notify(t("تم تحديث السؤال", "Question updated"), "success");
        setEditingQuizId(null);
      } else {
        notify(result.error, "error");
      }
    });
  };

  const removeQuiz = (quiz: AdminMatnQuiz) => {
    startQuizTransition(async () => {
      const confirmed = await confirm(
        t(
          `سيتم حذف السؤال: «${quiz.question}» نهائيًا.`,
          `The question "${quiz.question}" will be permanently deleted.`,
        ),
        {
          type: "warning",
          title: t("حذف السؤال", "Delete question"),
          confirmLabel: t("حذف", "Delete"),
          confirmVariant: "danger",
        },
      );
      if (!confirmed) return;
      const result = await deleteMatnQuiz(quiz.id);
      if (result.ok) {
        notify(t("تم حذف السؤال", "Question deleted"), "success");
      } else {
        notify(result.error, "error");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{matn.title}</h2>
          {matn.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{matn.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <HelpCircle size={13} />
            {matn.quizCount} {matn.quizCount === 1 ? "سؤال" : "أسئلة"}
          </span>
          <SirajTooltip label={t("تعديل المتن", "Edit matn")} side="top">
            <button
              type="button"
              onClick={startMatnEdit}
              disabled={matnPending}
              aria-label={`${t("تعديل", "Edit")} ${matn.title}`}
              className="p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              <Pencil size={16} />
            </button>
          </SirajTooltip>
          <SirajTooltip label={t("حذف المتن وأسئلته", "Delete matn and its questions")} side="top">
            <button
              type="button"
              onClick={removeMatn}
              disabled={matnPending}
              aria-label={`${t("حذف", "Delete")} ${matn.title}`}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </SirajTooltip>
        </div>
      </div>

      {matnEditing && (
        <form
          onSubmit={submitMatnEdit}
          className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60"
        >
          <label htmlFor={`matn-edit-title-${matn.id}`} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("عنوان المتن", "Matn title")}
          </label>
          <input
            id={`matn-edit-title-${matn.id}`}
            required
            minLength={3}
            maxLength={200}
            value={matnTitle}
            disabled={matnPending}
            onChange={(e) => setMatnTitle(e.target.value)}
            className="admin-input"
          />
          <label htmlFor={`matn-edit-description-${matn.id}`} className="mb-1 mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("الوصف (اختياري)", "Description (optional)")}
          </label>
          <textarea
            id={`matn-edit-description-${matn.id}`}
            rows={3}
            maxLength={2000}
            value={matnDescription}
            disabled={matnPending}
            onChange={(e) => setMatnDescription(e.target.value)}
            className="admin-input"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={matnPending}
              className="admin-button w-auto px-5 disabled:opacity-50"
            >
              {matnPending ? t("جارٍ الحفظ...", "Saving...") : t("حفظ التعديلات", "Save changes")}
            </button>
            <button
              type="button"
              disabled={matnPending}
              onClick={() => setMatnEditing(false)}
              className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400"
            >
              {t("إلغاء", "Cancel")}
            </button>
          </div>
        </form>
      )}

      {matn.quizzes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {matn.quizzes.map((quiz, index) => (
            <li key={quiz.id} className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 font-bold text-gray-900 dark:text-white">
                  <span className="ms-1 text-gray-400">{index + 1}.</span> {quiz.question}
                </p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <SirajTooltip label={t("تعديل السؤال", "Edit question")} side="top">
                    <button
                      type="button"
                      onClick={() => startQuizEdit(quiz)}
                      disabled={quizPending}
                      aria-label={`${t("تعديل السؤال", "Edit question")} ${index + 1}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-gray-800 disabled:opacity-40"
                    >
                      <Pencil size={15} />
                    </button>
                  </SirajTooltip>
                  <SirajTooltip label={t("حذف السؤال", "Delete question")} side="top">
                    <button
                      type="button"
                      onClick={() => removeQuiz(quiz)}
                      disabled={quizPending}
                      aria-label={`${t("حذف السؤال", "Delete question")} ${index + 1}`}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </SirajTooltip>
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-6 text-gray-600 dark:text-gray-300">
                {quiz.correctAnswer}
              </p>

              {editingQuizId === quiz.id && (
                <form
                  onSubmit={(event) => submitQuizEdit(event, quiz)}
                  className="mt-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                >
                  <label htmlFor={`quiz-edit-question-${quiz.id}`} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("السؤال/المقطع", "Question / passage")}
                  </label>
                  <input
                    id={`quiz-edit-question-${quiz.id}`}
                    required
                    minLength={3}
                    maxLength={500}
                    value={quizQuestion}
                    disabled={quizPending}
                    onChange={(e) => setQuizQuestion(e.target.value)}
                    className="admin-input"
                  />
                  <label htmlFor={`quiz-edit-answer-${quiz.id}`} className="mb-1 mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("النص الصحيح", "Correct text")}
                  </label>
                  <textarea
                    id={`quiz-edit-answer-${quiz.id}`}
                    required
                    rows={3}
                    maxLength={4000}
                    value={quizAnswer}
                    disabled={quizPending}
                    onChange={(e) => setQuizAnswer(e.target.value)}
                    className="admin-input"
                  />
                  <QuizTypeFields
                    idPrefix={`quiz-edit-${quiz.id}`}
                    type={quizType}
                    onTypeChange={setQuizType}
                    optionsText={quizOptionsText}
                    onOptionsTextChange={setQuizOptionsText}
                    disabled={quizPending}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={quizPending}
                      className="admin-button w-auto px-5 disabled:opacity-50"
                    >
                      {quizPending ? t("جارٍ الحفظ...", "Saving...") : t("حفظ السؤال", "Save question")}
                    </button>
                    <button
                      type="button"
                      disabled={quizPending}
                      onClick={() => setEditingQuizId(null)}
                      className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      {t("إلغاء", "Cancel")}
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <GenerateMatnQuizzes matnId={matn.id} />

      <NewMatnQuizForm matnId={matn.id} />

      <SirajDialog {...dialog} />
      <SirajDialog {...confirmDialog} />
    </section>
  );
}
