"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
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

function formatRelativeDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absolute < 60) return rtf.format(diffSeconds, "second");
  if (absolute < 60 * 60) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (absolute < 24 * 60 * 60) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  if (absolute < 7 * 24 * 60 * 60) return rtf.format(Math.round(diffSeconds / 86400), "day");
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
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
    return t(fallbackAr, fallbackEn);
  };

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

  const locale = lang === "ar" ? "ar" : "en";
  const textareaClass =
    "w-full resize-y rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500";

  const authorBadge = (role: string) =>
    role === "ADMIN" ? (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
        {t("مشرف", "Admin")}
      </span>
    ) : null;

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
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                {question.content}
              </p>

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
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {reply.content}
                      </p>
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
