"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Loader2, Pencil, Trash2 } from "lucide-react";
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
  const router = useRouter();
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [matnDeleted, setMatnDeleted] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const deleteBusyRef = useRef(false);

  const startMatnEdit = () => {
    setMatnTitle(matn.title);
    setMatnDescription(matn.description ?? "");
    setMatnEditing(true);
  };

  const submitMatnEdit = (event: FormEvent) => {
    event.preventDefault();
    startMatnTransition(async () => {
      // Keep the transition promise from rejecting: React renders the rejected
      // thenable on the next pass and the whole card would crash.
      try {
        const result = await updateMatn(matn.id, { title: matnTitle, description: matnDescription });
        if (result.ok) {
          notify(t("تم تحديث المتن", "Matn updated"), "success");
          setMatnEditing(false);
          router.refresh();
        } else {
          notify(result.error, "error");
        }
      } catch (err) {
        console.error("UPDATE_MATN_ERROR:", err);
        notify(t("حدث خطأ أثناء الاتصال بالسيرفر", "An error occurred while connecting to the server"), "error");
      }
    });
  };

  // The confirm dialog MUST be awaited outside startMatnTransition: while an
  // async transition promise is pending React suspends this component (the
  // isPending thenable), so the dialog could never render, its promise could
  // never resolve, and the trash button stayed faded/disabled forever.
  const handleDelete = async () => {
    if (deleteBusyRef.current) return;
    deleteBusyRef.current = true;
    // Every step (confirm, action call, notifications) lives inside this
    // try/finally so the busy flag is always released and the button can
    // never stay disabled/faded indefinitely.
    try {
      const confirmed = await confirm(
        t(
          `هل أنت متأكد من حذف هذا المتن وجميع الأسئلة المرتبطة به؟ سيُحذف المتن «${matn.title}» مع أسئلة التسميع (${matn.quizCount}) نهائيًا ولا يمكن التراجع.`,
          `Are you sure you want to delete this matn and all its related questions? "${matn.title}" and its ${matn.quizCount} recitation questions will be permanently removed and cannot be undone.`,
        ),
        {
          type: "warning",
          title: t("تأكيد حذف المتن", "Confirm matn deletion"),
          confirmLabel: t("حذف نهائي", "Delete forever"),
          confirmVariant: "danger",
        },
      );
      if (!confirmed) return;

      setIsDeleting(true);

      // Server actions can return { ok: true }, { success: true }, a bare
      // boolean, or nothing at all (e.g. an auth redirect) — normalise the
      // payload first so a missing/odd shape never throws mid-handler.
      const outcome: boolean | { ok?: boolean; success?: boolean; error?: string } | null | undefined =
        await deleteMatn(matn.id);
      const result: { ok?: boolean; success?: boolean; error?: string } =
        typeof outcome === "object" && outcome !== null ? outcome : { ok: outcome === true };

      // Handle both { ok: true } and { success: true } response schemas.
      if (result?.ok || result?.success) {
        notify(t("تم حذف المتن وأسئلته", "Matn and its questions were deleted"), "success");
        // Optimistic UI: drop the card right away, then re-fetch the route so
        // the server-rendered list catches up without a manual reload.
        setMatnDeleted(true);
        router.refresh();
      } else {
        notify(result?.error || t("تعذر حذف المتن", "Could not delete the matn"), "error");
        setIsDeleting(false); // Instantly reset opacity if server rejected
      }
    } catch (err) {
      console.error("DELETE_MATN_ERROR:", err);
      notify(t("حدث خطأ أثناء الاتصال بالسيرفر", "An error occurred while connecting to the server"), "error");
      setIsDeleting(false); // Instantly reset opacity on network/uncaught error
    } finally {
      // Guaranteed cleanup on success, failure, or exception — the trash
      // button can never stay disabled/faded indefinitely.
      setIsDeleting(false);
      deleteBusyRef.current = false;
    }
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
      // Same as submitMatnEdit: never let the transition promise reject.
      try {
        const result = await updateMatnQuiz(quiz.id, {
          question: quizQuestion,
          correctAnswer: quizAnswer,
          type: quizType,
          options: quizType === "mcq" ? parseOptionsText(quizOptionsText) : undefined,
        });
        if (result.ok) {
          notify(t("تم تحديث السؤال", "Question updated"), "success");
          setEditingQuizId(null);
          router.refresh();
        } else {
          notify(result.error, "error");
        }
      } catch (err) {
        console.error("UPDATE_QUIZ_ERROR:", err);
        notify(t("حدث خطأ أثناء الاتصال بالسيرفر", "An error occurred while connecting to the server"), "error");
      }
    });
  };

  // Same rule as handleDelete: confirm() must resolve before any transition
  // starts, otherwise the component suspends and the dialog can never render.
  const removeQuiz = async (quiz: AdminMatnQuiz) => {
    if (deleteBusyRef.current) return;
    deleteBusyRef.current = true;
    try {
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

      setDeletingQuizId(quiz.id);
      try {
        const outcome: boolean | { ok?: boolean; success?: boolean; error?: string } | null | undefined =
          await deleteMatnQuiz(quiz.id);
        const result: { ok?: boolean; success?: boolean; error?: string } =
          typeof outcome === "object" && outcome !== null ? outcome : { ok: outcome === true };
        if (result?.ok || result?.success) {
          notify(t("تم حذف السؤال", "Question deleted"), "success");
          // Re-render the server components so the quiz list and its count
          // update without a manual page reload.
          router.refresh();
        } else {
          notify(result?.error || t("تعذر حذف السؤال", "Could not delete the question"), "error");
        }
      } catch (err) {
        console.error("DELETE_QUIZ_ERROR:", err);
        notify(t("حدث خطأ أثناء الاتصال بالسيرفر", "An error occurred while connecting to the server"), "error");
      }
    } finally {
      setDeletingQuizId(null);
      deleteBusyRef.current = false;
    }
  };

  // Optimistic removal: once the server confirmed the delete, drop the card
  // markup immediately and keep only the success dialog mounted while the
  // router refresh re-renders the list without this matn.
  if (matnDeleted) {
    return <SirajDialog {...dialog} />;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{matn.title}</h2>
          {matn.description && (
            <p className="mt-1 line-clamp-3 break-words text-sm text-gray-500 dark:text-gray-400">{matn.description}</p>
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
              onClick={handleDelete}
              disabled={matnPending || isDeleting}
              aria-label={`${t("حذف", "Delete")} ${matn.title}`}
              aria-busy={isDeleting}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
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
            {t("نص المتن", "Matn text")}
          </label>
          <textarea
            id={`matn-edit-description-${matn.id}`}
            rows={3}
            maxLength={20000}
            value={matnDescription}
            disabled={matnPending}
            onChange={(e) => setMatnDescription(e.target.value)}
            placeholder={t(
              "انسخ ونشـر نص المتن كاملاً هنا ليتولى الذكاء الاصطناعي تحليل وإنشاء الأسئلة منه تلقائياً...",
              "Paste the full matn text here so the AI can analyze it and generate questions automatically...",
            )}
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
                      disabled={quizPending || deletingQuizId === quiz.id}
                      aria-label={`${t("حذف السؤال", "Delete question")} ${index + 1}`}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
                    >
                      {deletingQuizId === quiz.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
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

      <GenerateMatnQuizzes matnId={matn.id} initialText={matn.description ?? ""} />

      <NewMatnQuizForm matnId={matn.id} />

      <SirajDialog {...dialog} />
      <SirajDialog {...confirmDialog} />
    </section>
  );
}
