"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";

interface QAUser {
  id: string;
  name: string;
  role: string;
}

interface QAReply {
  id: string;
  content: string;
  createdAt: string;
  user: QAUser;
}

interface QAQuestion {
  id: string;
  content: string;
  createdAt: string;
  user: QAUser;
  replies: QAReply[];
}

type CreateQuestionResponse =
  | { parentId: null; question: QAQuestion }
  | { parentId: string; reply: QAReply };

interface LessonQAProps {
  lessonId: string;
  currentUser: { id: string; name: string; role: string } | null;
}

const MAX_CONTENT_LENGTH = 2000;

const textareaClass =
  "w-full resize-y rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500";

function formatRelativeDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absolute < 60) return rtf.format(diffSeconds, "second");
  if (absolute < 60 * 60) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (absolute < 24 * 60 * 60) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  if (absolute < 7 * 24 * 60 * 60) return rtf.format(Math.round(diffSeconds / (24 * 60 * 60)), "day");
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

// Top-level (module scope, not nested in the parent) so React keeps the
// textarea mounted while typing — a nested definition would remount it and
// steal focus on every keystroke.
interface EditFormProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  rows: number;
}

function EditForm({ value, onChange, onSave, onCancel, saving, error, rows }: EditFormProps) {
  const { t } = useLang();
  return (
    <div className="mt-1">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={MAX_CONTENT_LENGTH}
        autoFocus
        className={textareaClass}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || value.trim().length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? t("جارٍ الحفظ...", "Saving...") : t("حفظ", "Save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {t("إلغاء", "Cancel")}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default function LessonQA({ lessonId, currentUser }: LessonQAProps) {
  const { t, lang } = useLang();
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/lessons/${lessonId}/questions`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`unexpected status ${response.status}`);
        const body: { questions?: unknown } = await response.json();
        if (!active) return;
        setQuestions(Array.isArray(body.questions) ? (body.questions as QAQuestion[]) : []);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [lessonId, reloadKey]);

  const postError = (response: Response, fallbackAr: string, fallbackEn: string): string => {
    if (response.status === 401) {
      return t("انتهت الجلسة، يرجى تسجيل الدخول من جديد", "Session expired, please sign in again");
    }
    if (response.status === 403) {
      return t("لا تملك صلاحية لهذا الإجراء", "You are not allowed to perform this action");
    }
    return t(fallbackAr, fallbackEn);
  };

  const canManage = (user: QAUser): boolean =>
    currentUser !== null && (currentUser.id === user.id || currentUser.role === "ADMIN");

  const submitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setFormError("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        setFormError(postError(response, "تعذر نشر السؤال، حاول مجددًا", "Could not post the question, try again"));
        return;
      }
      const body: CreateQuestionResponse = await response.json();
      if (!("question" in body) || body.parentId !== null) {
        setFormError(t("تعذر نشر السؤال، حاول مجددًا", "Could not post the question, try again"));
        return;
      }
      setQuestions((prev) => [body.question, ...prev]);
      setDraft("");
    } catch {
      setFormError(t("تعذر نشر السؤال، حاول مجددًا", "Could not post the question, try again"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>, questionId: string) => {
    event.preventDefault();
    const content = replyDraft.trim();
    if (!content || replySubmitting) return;
    setReplySubmitting(true);
    setReplyError("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId: questionId }),
      });
      if (!response.ok) {
        setReplyError(postError(response, "تعذر نشر الرد، حاول مجددًا", "Could not post the reply, try again"));
        return;
      }
      const body: CreateQuestionResponse = await response.json();
      if (!("reply" in body) || body.parentId === null) {
        setReplyError(t("تعذر نشر الرد، حاول مجددًا", "Could not post the reply, try again"));
        return;
      }
      setQuestions((prev) =>
        prev.map((question) =>
          question.id === questionId ? { ...question, replies: [...question.replies, body.reply] } : question,
        ),
      );
      setReplyDraft("");
      setReplyingTo(null);
    } catch {
      setReplyError(t("تعذر نشر الرد، حاول مجددًا", "Could not post the reply, try again"));
    } finally {
      setReplySubmitting(false);
    }
  };

  const closeReply = () => {
    setReplyingTo(null);
    setReplyDraft("");
    setReplyError("");
  };

  const startEdit = (item: { id: string; content: string }) => {
    setEditingId(item.id);
    setEditDraft(item.content);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
    setEditError("");
  };

  // replyId === null -> editing the question itself, otherwise a reply of
  // that question. The target row is always (questionId, replyId ?? questionId).
  const saveEdit = async (questionId: string, replyId: string | null) => {
    const content = editDraft.trim();
    if (!content || isSaving) return;
    const targetId = replyId ?? questionId;
    setIsSaving(true);
    setEditError("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}/questions/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        setEditError(postError(response, "تعذر حفظ التعديل، حاول مجددًا", "Could not save the edit, try again"));
        return;
      }
      if (replyId === null) {
        setQuestions((prev) =>
          prev.map((question) => (question.id === questionId ? { ...question, content } : question)),
        );
      } else {
        setQuestions((prev) =>
          prev.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  replies: question.replies.map((reply) =>
                    reply.id === replyId ? { ...reply, content } : reply,
                  ),
                }
              : question,
          ),
        );
      }
      cancelEdit();
    } catch {
      setEditError(t("تعذر حفظ التعديل، حاول مجددًا", "Could not save the edit, try again"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (questionId: string, replyId: string | null) => {
    if (
      !window.confirm(t("هل أنت متأكد من الحذف؟", "Are you sure you want to delete this?"))
    ) {
      return;
    }
    const targetId = replyId ?? questionId;
    setIsDeleting(targetId);
    setDeleteError("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}/questions/${targetId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setDeleteError(postError(response, "تعذر حذف العنصر، حاول مجددًا", "Could not delete the item, try again"));
        return;
      }
      if (replyId === null) {
        // Removing the question also removes its replies from the UI.
        setQuestions((prev) => prev.filter((question) => question.id !== questionId));
        if (replyingTo === questionId) closeReply();
      } else {
        setQuestions((prev) =>
          prev.map((question) =>
            question.id === questionId
              ? { ...question, replies: question.replies.filter((reply) => reply.id !== replyId) }
              : question,
          ),
        );
      }
      if (editingId === targetId) cancelEdit();
    } catch {
      setDeleteError(t("تعذر حذف العنصر، حاول مجددًا", "Could not delete the item, try again"));
    } finally {
      setIsDeleting(null);
    }
  };

  const locale = lang === "ar" ? "ar" : "en";

  const authorBadge = (role: string) =>
    role === "ADMIN" ? (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
        {t("مشرف", "Admin")}
      </span>
    ) : null;

  const actionButtons = (user: QAUser, questionId: string, replyId: string | null, content: string) => {
    if (!canManage(user)) return null;
    const targetId = replyId ?? questionId;
    return (
      <span className="ms-auto inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => startEdit({ id: targetId, content })}
          disabled={isDeleting !== null || isSaving}
          aria-label={t("تعديل", "Edit")}
          title={t("تعديل", "Edit")}
          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-50"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={() => deleteItem(questionId, replyId)}
          disabled={isDeleting !== null || isSaving}
          aria-label={t("حذف", "Delete")}
          title={t("حذف", "Delete")}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
        >
          <Trash2 size={13} />
        </button>
      </span>
    );
  };

  return (
    <section
      id="lesson-qa"
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8 mb-6"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <MessageCircle size={16} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {t("أسئلة الطلاب", "Student Questions")}
          </h2>
        </div>
        {status === "ready" && (
          <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
            {questions.length}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t("اطرح سؤالك حول الدرس وسيصلك رد.", "Ask a question about this lesson and get an answer.")}
      </p>

      {currentUser ? (
        <form onSubmit={submitQuestion} className="mb-8">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder={t("اكتب سؤالك هنا...", "Write your question here...")}
            className={textareaClass}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">
              {draft.trim().length}/{MAX_CONTENT_LENGTH}
            </span>
            <button
              type="submit"
              disabled={submitting || draft.trim().length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Send size={15} />
              {submitting ? t("جارٍ النشر...", "Posting...") : t("إرسال السؤال", "Post question")}
            </button>
          </div>
          {formError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
        </form>
      ) : (
        <div className="mb-8 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
          <Link
            href="/auth/login"
            className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
          >
            {t("يرجى تسجيل الدخول لطرح سؤال", "Sign in to ask a question")}
          </Link>
        </div>
      )}

      {status === "loading" && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">{t("جارٍ التحميل...", "Loading...")}</p>
      )}

      {status === "error" && (
        <div className="py-4 flex flex-col items-start gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("تعذر تحميل الأسئلة", "Could not load questions")}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <MessageCircle size={13} />
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      )}

      {status === "ready" && questions.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
          {t("لا توجد أسئلة بعد. كن أول من يطرح سؤالًا!", "No questions yet. Be the first to ask!")}
        </p>
      )}

      {status === "ready" && questions.length > 0 && (
        <div className="space-y-6">
          {deleteError && (
            <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
          )}
          {questions.map((question) => (
            <article
              key={question.id}
              className="border-t border-gray-100 dark:border-gray-800 pt-6 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center flex-wrap gap-2 mb-1.5">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {question.user.name}
                </span>
                {authorBadge(question.user.role)}
                <span className="text-xs text-gray-400">
                  {formatRelativeDate(question.createdAt, locale)}
                </span>
                {actionButtons(question.user, question.id, null, question.content)}
              </div>

              {editingId === question.id ? (
                <EditForm
                  value={editDraft}
                  onChange={setEditDraft}
                  onSave={() => saveEdit(question.id, null)}
                  onCancel={cancelEdit}
                  saving={isSaving}
                  error={editError}
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                  {question.content}
                </p>
              )}

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo((current) => (current === question.id ? null : question.id));
                    setReplyDraft("");
                    setReplyError("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                >
                  <MessageCircle size={13} />
                  {t("رد", "Reply")}
                </button>
              </div>

              {question.replies.length > 0 && (
                <div className="mt-4 ms-8 border-s-2 border-emerald-200 dark:border-emerald-800/60 ps-4 space-y-4">
                  {question.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          {reply.user.name}
                        </span>
                        {authorBadge(reply.user.role)}
                        <span className="text-xs text-gray-400">
                          {formatRelativeDate(reply.createdAt, locale)}
                        </span>
                        {actionButtons(reply.user, question.id, reply.id, reply.content)}
                      </div>

                      {editingId === reply.id ? (
                        <EditForm
                          value={editDraft}
                          onChange={setEditDraft}
                          onSave={() => saveEdit(question.id, reply.id)}
                          onCancel={cancelEdit}
                          saving={isSaving}
                          error={editError}
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                          {reply.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === question.id && (
                <form
                  onSubmit={(event) => submitReply(event, question.id)}
                  className="mt-4 ms-8 border-s-2 border-emerald-200 dark:border-emerald-800/60 ps-4"
                >
                  <textarea
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value)}
                    rows={2}
                    maxLength={MAX_CONTENT_LENGTH}
                    placeholder={t("اكتب ردك...", "Write your reply...")}
                    className={textareaClass}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={replySubmitting || replyDraft.trim().length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Send size={13} />
                      {replySubmitting ? t("جارٍ النشر...", "Posting...") : t("إرسال الرد", "Post reply")}
                    </button>
                    <button
                      type="button"
                      onClick={closeReply}
                      className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t("إلغاء", "Cancel")}
                    </button>
                  </div>
                  {replyError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{replyError}</p>}
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
