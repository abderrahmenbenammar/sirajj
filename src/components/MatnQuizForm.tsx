"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent } from "react";
import { CheckCircle2, Loader2, Mic, MicOff, Send, XCircle } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import SirajTooltip from "@/components/ui/SirajTooltip";
import type { GradeMatnResult } from "@/app/api/grade-matn/route";

interface MatnQuizFormProps {
  question?: string;
  correctAnswer?: string;
}

const DEFAULT_CORRECT_ANSWER = "أن تعبد الله مخلصا له الدين";
const MAX_AUDIO_BYTES = 8_000_000; // matches the API route cap (8 MB)

// "unknown" = Permissions API not queried/unsupported; the runtime error path still catches it.
type MicPermissionState = "unknown" | "prompt" | "granted" | "denied";

function subscribeNoop() {
  return () => {};
}

/** Live microphone permission state; null when the Permissions API is unavailable. */
async function readMicPermission(): Promise<PermissionState | null> {
  try {
    const status = await navigator.permissions.query({
      name: "microphone",
    } as unknown as PermissionDescriptor);
    return status.state;
  } catch {
    return null;
  }
}

export default function MatnQuizForm({ question, correctAnswer = DEFAULT_CORRECT_ANSWER }: MatnQuizFormProps) {
  const { t } = useLang();
  const [studentAnswer, setStudentAnswer] = useState("");
  const [result, setResult] = useState<GradeMatnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");
  // Browser capability check: SSR-safe (false on the server, live snapshot on the client).
  const recordSupported = useSyncExternalStore(
    subscribeNoop,
    () =>
      typeof window !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  );

  const textRef = useRef("");
  const suppressChangeRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  /** Stop and forget the active microphone stream (idempotent). */
  const releaseStream = () => {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
  };

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
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        recorder.onstop = null; // unmount: skip transcription, just release
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          // Recorder already stopped.
        }
      }
      releaseStream();
    };
  }, []);

  /**
   * Actionable guidance for a blocked microphone: while the site permission is
   * "denied" the browser never shows the prompt again, so the message must say
   * exactly where to re-enable it (retry alone cannot fix a persistent block).
   */
  const micDeniedGuidance = async () => {
    const state = await readMicPermission();
    if (state === "denied") {
      return t(
        "الإذن مرفوض مسبقًا لهذا الموقع فلن يظهر طلب جديد. أعِد التفعيل: أيقونة القفل في شريط العنوان ← إعدادات الموقع ← الميكروفون ← اسمح، ثم أعد المحاولة",
        "Permission is blocked for this site, so no new prompt appears. Re-enable it: lock icon in the address bar → Site settings → Microphone → Allow, then retry",
      );
    }
    return t(
      "لم يُمنح إذن الميكروفون — اضغط «سماح» عند ظهور الطلب ثم أعد المحاولة",
      "Microphone permission not granted — click \"Allow\" when prompted, then retry",
    );
  };

  /** Send the recorded Blob to the server and insert the transcript into the textarea. */
  const transcribeAudio = async (blob: Blob) => {
    if (blob.size === 0) {
      setError(t("لم يُلتقط أي صوت — أعد التسجيل", "No audio captured — record again"));
      return;
    }
    if (blob.size > MAX_AUDIO_BYTES) {
      setError(
        t("التسجيل طويل جدًا (الحد 8 ميغابايت) — سجّل مقطعًا أقصر", "Recording too long (8 MB limit) — record a shorter clip"),
      );
      return;
    }
    setIsTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : t("تعذر تحويل الصوت إلى نص، حاول مجددًا", "Transcription failed, try again"),
        );
        return;
      }
      const transcript = typeof data?.text === "string" ? data.text.trim() : "";
      if (!transcript) {
        setError(t("لم يُلتقط صوت واضح — أعد التسجيل", "No clear speech detected — record again"));
        return;
      }
      // Insert the transcript directly into the response textarea.
      const base = textRef.current;
      const joined = base.length > 0 && !/\s$/.test(base) ? `${base} ${transcript}` : `${base}${transcript}`;
      textRef.current = joined;
      suppressChangeRef.current = true;
      setStudentAnswer(joined);
    } catch {
      setError(t("تعذر الاتصال بالخادم", "Could not reach the server"));
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    setIsListening(false);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop(); // onstop assembles the Blob and transcribes it
      } catch {
        // Recorder already stopped.
      }
    } else {
      releaseStream();
    }
  };

  // Permission-first pattern: acquire the mic through getUserMedia, record with
  // the standard MediaRecorder API (no browser SpeechRecognition — it is
  // origin-restricted on Vercel deployments), then transcribe server-side.
  const startRecording = async () => {
    if (!recordSupported || recorderRef.current || startingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        t(
          "المتصفح لا يدعم الوصول إلى الميكروفون (يلزم اتصال آمن)",
          "This browser cannot access the microphone (a secure connection is required)",
        ),
      );
      return;
    }
    startingRef.current = true;
    setError(null);
    releaseStream(); // drop any stale stream from an interrupted session

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        // The stream is released by onstop (which always follows an error);
        // nothing is destroyed here so a transient fault can still recover.
        setError(t("تعذر تسجيل الصوت — أعد المحاولة", "Recording failed — try again"));
      };
      recorder.onstop = () => {
        recorderRef.current = null;
        releaseStream(); // recording stopped completely -> let go of the mic
        setIsListening(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void transcribeAudio(blob);
      };

      recorderRef.current = recorder;
      recorder.start(1000); // periodic chunks so long recordings are not lost
      setIsListening(true);
    } catch (error) {
      // Friendly inline guidance only — no permanent UI lock; the next click
      // retries. Branch on the real failure cause so a missing/busy microphone
      // is never mislabeled as a permission denial.
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        recorder.onstop = null; // failed start: never transcribe
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          // Recorder already stopped.
        }
      }
      releaseStream();
      setIsListening(false);
      const name = error instanceof Error ? error.name : "";
      const detail = error instanceof Error && error.message ? ` (${name}: ${error.message})` : name ? ` (${name})` : "";
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError(t("لم يُعثر على ميكروفون متاح في هذا الجهاز", "No microphone found on this device") + detail);
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError(
          t("الميكروفون مستخدم حاليًا من تطبيق آخر — أغلقه ثم أعد المحاولة", "The microphone is busy in another app — close it and try again") + detail,
        );
      } else if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        setError((await micDeniedGuidance()) + detail);
      } else if (name === "NotSupportedError") {
        setError(t("المتصفح لا يدعم تسجيل الصوت", "This browser does not support audio recording") + detail);
      } else {
        setError(t("تعذر تشغيل الميكروفون — أعد المحاولة", "Could not start the microphone — try again") + detail);
      }
    } finally {
      startingRef.current = false;
    }
  };

  const handleAnswerChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (suppressChangeRef.current) {
      suppressChangeRef.current = false;
      return;
    }
    // Manual edit while recording -> stop so the two never clash.
    if (recorderRef.current) stopRecording();
    textRef.current = event.target.value;
    setStudentAnswer(event.target.value);
  };

  const handleSubmit = () => {
    if (recorderRef.current) stopRecording();
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
        {!recordSupported ? (
          <SirajTooltip
            label={t("التسجيل الصوتي غير مدعوم في هذا المتصفح", "Audio recording is not supported in this browser")}
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
        ) : (
          <SirajTooltip
            label={
              isListening
                ? t("إيقاف التسجيل", "Stop recording")
                : isTranscribing
                  ? t("جارٍ تحويل الصوت إلى نص", "Transcribing audio to text")
                  : micPermission === "denied"
                    ? t("الإذن مرفوض مسبقًا — أعِد التفعيل من أيقونة القفل في شريط العنوان", "Blocked — re-enable via the address-bar lock icon")
                    : t("تحدّث بالعربية بدل الكتابة", "Dictate in Arabic instead of typing")
            }
            side="top"
          >
            <button
              type="button"
              onClick={() => (isListening ? stopRecording() : void startRecording())}
              disabled={isGrading || isTranscribing}
              aria-pressed={isListening}
              aria-label={t("الإملاء الصوتي", "Voice dictation")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isListening
                  ? "animate-pulse bg-red-500 text-white shadow-sm"
                  : "border border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-red-800 dark:hover:text-red-400"
              }`}
            >
              <Mic size={15} className="shrink-0" />
              {isListening
                ? t("جارٍ التسجيل...", "Recording...")
                : isTranscribing
                  ? t("جارٍ التحويل...", "Transcribing...")
                  : t("تحدّث", "Dictate")}
            </button>
          </SirajTooltip>
        )}

        {isListening && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400" aria-live="polite">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {t("يسجّل صوتك الآن", "Recording your voice")}
          </span>
        )}

        {isTranscribing && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400" aria-live="polite">
            <Loader2 size={13} className="animate-spin" />
            {t("جارٍ تحويل الصوت إلى نص...", "Transcribing audio to text...")}
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
    </div>
  );
}
