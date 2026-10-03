"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent } from "react";
import { CheckCircle2, Loader2, Mic, MicOff, Send, XCircle } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import SirajTooltip from "@/components/ui/SirajTooltip";
import SirajDialog from "@/components/ui/SirajDialog";
import type { GradeMatnResult } from "@/app/api/grade-matn/route";

interface MatnQuizFormProps {
  question?: string;
  correctAnswer?: string;
}

const DEFAULT_CORRECT_ANSWER = "أن تعبد الله مخلصا له الدين";

// "unknown" = Permissions API not queried/unsupported; the runtime error path still catches it.
type MicPermissionState = "unknown" | "prompt" | "granted" | "denied";

// SpeechRecognition is not part of lib.dom, so we type the small surface we use.
type DictationResultItem = { isFinal: boolean; 0: { transcript: string } };
type DictationEvent = { results: ArrayLike<DictationResultItem> };
type DictationRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: DictationEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type DictationCtor = new () => DictationRecognition;

function getDictationCtor(): DictationCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: DictationCtor;
    webkitSpeechRecognition?: DictationCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Join spoken chunks, inserting a single space only when the text needs it. */
function appendSpoken(existing: string, chunk: string): string {
  const text = chunk.trim();
  if (!text) return existing;
  if (!existing) return text;
  return /[\s\u00A0]$/.test(existing) ? existing + text : `${existing} ${text}`;
}

function subscribeNoop() {
  return () => {};
}

export default function MatnQuizForm({ question, correctAnswer = DEFAULT_CORRECT_ANSWER }: MatnQuizFormProps) {
  const { t } = useLang();
  const [studentAnswer, setStudentAnswer] = useState("");
  const [result, setResult] = useState<GradeMatnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");
  const [showMicHelp, setShowMicHelp] = useState(false);
  // Browser capability check: SSR-safe (false on the server, live snapshot on the client).
  const speechSupported = useSyncExternalStore(
    subscribeNoop,
    () => getDictationCtor() !== null,
    () => false,
  );

  const textRef = useRef("");
  const dictationBaseRef = useRef("");
  const finalTranscriptRef = useRef("");
  const suppressChangeRef = useRef(false);
  const recognitionRef = useRef<DictationRecognition | null>(null);

  useEffect(() => {
    // Check the microphone permission once on mount and keep it live
    // (state flips automatically when the student enables it in browser settings).
    let cancelled = false;
    let status: PermissionStatus | null = null;
    try {
      void navigator.permissions
        .query({ name: "microphone" } as unknown as PermissionDescriptor)
        .then((s) => {
          if (cancelled) return;
          status = s;
          setMicPermission(s.state);
          s.onchange = () => {
            if (!cancelled) setMicPermission(s.state);
          };
        })
        .catch(() => {
          // Browser cannot query microphone permission (e.g. older Firefox/Safari).
        });
    } catch {
      // Synchronous unsupported-shape errors are ignored the same way.
    }
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
      recognitionRef.current?.abort();
    };
  }, []);

  /** Update the textarea from dictation without being mistaken for a user edit. */
  const pushDictationText = (value: string) => {
    if (value === textRef.current) return;
    textRef.current = value;
    suppressChangeRef.current = true;
    setStudentAnswer(value);
  };

  const stopDictation = () => {
    setIsListening(false);
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Recognition already ended.
      }
    }
  };

  const startDictation = () => {
    const Ctor = getDictationCtor();
    if (!Ctor || recognitionRef.current) return;
    setError(null);
    // Keep whatever the student already typed and append dictation after it.
    dictationBaseRef.current = textRef.current;
    finalTranscriptRef.current = "";

    const recognition = new Ctor();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finals = appendSpoken(finals, item[0].transcript);
        } else {
          interim += item[0].transcript;
        }
      }
      finalTranscriptRef.current = finals;
      pushDictationText(appendSpoken(dictationBaseRef.current, appendSpoken(finals, interim)));
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        // Blocked (or still shown as blocked): remember it and open the friendly guide.
        setMicPermission("denied");
        setShowMicHelp(true);
      } else if (event.error === "audio-capture") {
        setError(t("لم يتم العثور على ميكروفون", "No microphone found"));
      } else if (event.error === "network") {
        setError(
          t("تعذر الاتصال بخدمة التعرّف على الصوت", "Speech service unavailable — check your connection"),
        );
      }
      // "no-speech" (silence) and transient errors simply end the session via onend.
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setError(t("تعذر تشغيل الميكروفون", "Could not start the microphone"));
    }
  };

  const handleAnswerChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (suppressChangeRef.current) {
      suppressChangeRef.current = false;
      return;
    }
    // Manual edit while dictating -> stop the microphone so the two never clash.
    if (recognitionRef.current) stopDictation();
    textRef.current = event.target.value;
    setStudentAnswer(event.target.value);
  };

  const handleMicRetry = () => {
    setShowMicHelp(false);
    // Go straight to start(): if the student already enabled the microphone this
    // succeeds; otherwise the not-allowed error re-opens the guide dialog.
    startDictation();
  };

  const handleSubmit = () => {
    if (recognitionRef.current) stopDictation();
    if (studentAnswer.trim().length === 0) {
      setError(t("اكتب إجابتك أولًا", "Write your answer first"));
      return;
    }
    setIsGrading(true);
    setError(null);
    setResult(null);

    void (async () => {
      try {
        const res = await fetch("/api/grade-matn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentAnswer, correctAnswer }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : t("تعذر التصحيح حاليًا، حاول مجددًا", "Grading failed, try again"),
          );
          return;
        }
        setResult(data as GradeMatnResult);
      } catch {
        setError(t("تعذر الاتصال بالخادم", "Could not reach the server"));
      } finally {
        setIsGrading(false);
      }
    })();
  };

  return (
    <div dir="rtl" className="w-full max-w-2xl mx-auto rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        {t("اختبار حفظ المتن", "Matn memorization quiz")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("اكتب المتن من حفظك ثم اضغط تصحيح", "Type the matn from memory, then submit")}
      </p>

      {question && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {t("السؤال", "Question")}
          </p>
          <p className="mt-1 text-sm font-medium leading-7 text-gray-900 dark:text-white">
            {question}
          </p>
        </div>
      )}

      <label
        htmlFor="matn-answer"
        className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {t("إجابتك", "Your answer")}
      </label>
      <textarea
        id="matn-answer"
        value={studentAnswer}
        onChange={handleAnswerChange}
        rows={5}
        disabled={isGrading}
        placeholder={t("اكتب المتن هنا...", "Type the matn here...")}
        className={`mt-2 w-full rounded-xl border p-3 text-base leading-8 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-100 ${
          isListening
            ? "border-red-500 bg-gray-50 focus:border-red-500 focus:ring-red-500/40 dark:border-red-800"
            : "border-gray-300 bg-gray-50 focus:border-emerald-500 focus:ring-emerald-500/30 dark:border-gray-700"
        }`}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!speechSupported ? (
          <SirajTooltip
            label={t("الإملاء الصوتي غير مدعوم في هذا المتصفح", "Voice dictation is not supported in this browser")}
            side="top"
          >
            <button
              type="button"
              disabled
              aria-label={t("تحدّث", "Dictate")}
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-400 opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600"
            >
              <MicOff size={15} className="shrink-0" />
              {t("تحدّث", "Dictate")}
            </button>
          </SirajTooltip>
        ) : micPermission === "denied" ? (
          <SirajTooltip
            label={t("إذن الميكروفون مرفوض — اضغط لعرض طريقة التفعيل", "Microphone blocked — click for how to enable it")}
            side="top"
          >
            <button
              type="button"
              onClick={() => setShowMicHelp(true)}
              disabled={isGrading}
              aria-label={t("إذن الميكروفون مرفوض", "Microphone permission denied")}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition-colors hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
            >
              <MicOff size={15} className="shrink-0" />
              {t("الميكروفون موقوف", "Microphone blocked")}
            </button>
          </SirajTooltip>
        ) : (
          <SirajTooltip
            label={
              isListening
                ? t("إيقاف الاستماع", "Stop dictation")
                : t("تحدّث بالعربية بدل الكتابة", "Dictate in Arabic instead of typing")
            }
            side="top"
          >
            <button
              type="button"
              onClick={() => (isListening ? stopDictation() : startDictation())}
              disabled={isGrading}
              aria-pressed={isListening}
              aria-label={t("الإملاء الصوتي", "Voice dictation")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isListening
                  ? "animate-pulse bg-red-500 text-white shadow-sm"
                  : "border border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-red-800 dark:hover:text-red-400"
              }`}
            >
              <Mic size={15} className="shrink-0" />
              {isListening ? t("جارٍ الاستماع...", "Listening...") : t("تحدّث", "Dictate")}
            </button>
          </SirajTooltip>
        )}

        {isListening && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400" aria-live="polite">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {t("يسجّل صوتك الآن", "Recording your voice")}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isGrading || studentAnswer.trim().length === 0}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGrading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t("جارٍ التصحيح...", "Grading...")}
          </>
        ) : (
          <>
            <Send size={16} />
            {t("تصحيح", "Grade")}
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div
          aria-live="polite"
          className={`mt-5 rounded-xl border p-4 ${
            result.isPassed
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
          }`}
        >
          <div className="flex items-center gap-2">
            {result.isPassed ? (
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle size={20} className="shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span
              className={`text-sm font-bold ${
                result.isPassed
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-red-700 dark:text-red-300"
              }`}
            >
              {result.isPassed
                ? t("أحسنت! تم اجتياز الحفظ", "Passed — well done!")
                : t("لم يتم الاجتياز بعد، واصل المراجعة", "Not passed yet — keep reviewing")}
            </span>
            <span className="ms-auto text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
              <span dir="ltr">{result.score}%</span>
            </span>
          </div>
          <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
            {result.feedback}
          </p>

          {result.score < 100 && (
            <div className="mt-3 rounded-xl border border-emerald-200/70 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {t("النص الصحيح للمراجعة:", "Reference correct answer:")}
              </p>
              <p className="mt-1.5 text-sm font-medium leading-8 text-gray-900 dark:text-gray-100">
                {correctAnswer}
              </p>
            </div>
          )}
        </div>
      )}

      <SirajDialog
        open={showMicHelp}
        type="warning"
        title={t("الميكروفون موقوف", "Microphone is blocked")}
        message={t(
          "يحتاج التطبيق إلى إذن الميكروفون ليسمع تسميعك. اضغط على أيقونة القفل أو الميكروفون بجانب الرابط في شريط عنوان المتصفح، اختر «السماح»، ثم اضغط «إعادة المحاولة».",
          "The app needs microphone permission to hear your recitation. Click the lock/microphone icon next to the address bar, choose Allow, then press Try Again.",
        )}
        confirmLabel={t("إعادة المحاولة", "Try again")}
        cancelLabel={t("إغلاق", "Close")}
        onConfirm={handleMicRetry}
        onClose={() => setShowMicHelp(false)}
      />
    </div>
  );
}
