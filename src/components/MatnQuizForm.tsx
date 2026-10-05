"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, GripVertical, ListChecks, Loader2, Mic, MicOff, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { normalizeArabicText } from "@/lib/text-normalization";
import SirajTooltip from "@/components/ui/SirajTooltip";
import type { GradeMatnResult } from "@/app/api/grade-matn/route";

export interface MatnQuizQuestion {
  question: string;
  correctAnswer: string;
  type?: string | null;
  options?: unknown;
}

type QuestionType = "write" | "reorder" | "fill_blank" | "mcq";

const QUESTION_TYPES: readonly string[] = ["write", "reorder", "fill_blank", "mcq"];
const OPTION_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];
const MAX_BLANKS = 3;

// Light grammatical words that are rarely the "key" content of a passage.
const BLANK_STOPWORDS = new Set([
  "الذي", "التي", "الذين", "غير", "بعد", "عند", "بين", "لها", "له", "فيها",
  "منه", "منها", "الا", "او", "ثم", "بل", "قد", "مع", "الان",
]);

function getQuestionType(question: MatnQuizQuestion): QuestionType {
  return typeof question.type === "string" && QUESTION_TYPES.includes(question.type)
    ? (question.type as QuestionType)
    : "write";
}

/** Deterministic string hash -> uint32 seed. */
function hashSeed(text: string, salt: number): number {
  let h = salt >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** mulberry32 shuffle of index array — pure & stable across re-renders. */
function shuffleWithSeed(items: number[], seed: number): number[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick up to MAX_BLANKS "key" words (long content words) to hide in a
 * fill_blank question, spread across the passage. Always >= 1 blank.
 */
function computeBlankIndices(words: string[]): number[] {
  if (words.length === 0) return [];
  if (words.length === 1) return [0];

  const eligible = words
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => word.length >= 4 && !BLANK_STOPWORDS.has(word))
    .map(({ index }) => index);

  const pool = eligible.length > 0
    ? eligible
    : [Math.floor(words.length / 2)]; // fallback: hide the middle word

  const count = Math.min(MAX_BLANKS, pool.length);
  if (count === pool.length) return pool;

  // Spread the chosen blanks evenly across the eligible pool.
  const chosen = new Set<number>();
  const step = (pool.length - 1) / (count - 1);
  for (let k = 0; k < count; k += 1) chosen.add(pool[Math.round(k * step)]);
  return [...chosen].sort((a, b) => a - b);
}

interface MatnQuizFormProps {
  /** Matn title shown on the welcome hero card. */
  title?: string;
  questions: MatnQuizQuestion[];
}

type AnswerRecord = {
  text: string;
  score: number;
  feedback: string;
  isPassed: boolean;
};

type QuizState = "welcome" | "active" | "completed";

// Single source of truth for pass/fail (mirrors /api/grade-matn).
const PASS_THRESHOLD = 85;

export default function MatnQuizForm({ title, questions }: MatnQuizFormProps) {
  const { t } = useLang();
  const totalQuestions = questions.length;
  const [quizState, setQuizState] = useState<QuizState>("welcome");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, AnswerRecord>>({});
  const [studentAnswer, setStudentAnswer] = useState("");
  const [reorderPicks, setReorderPicks] = useState<number[]>([]);
  const [blankValues, setBlankValues] = useState<string[]>([]);
  const [mcqChoice, setMcqChoice] = useState<string | null>(null);
  const [result, setResult] = useState<GradeMatnResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSupported, setRecordSupported] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [microphoneToast, setMicrophoneToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);
  const studentAnswerRef = useRef(studentAnswer);
  const recordingChunksRef = useRef<Blob[]>([]);
  const toastTimerRef = useRef<number | null>(null);

  const showMicrophoneToast = (message: string) => {
    setMicrophoneToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setMicrophoneToast(null);
      toastTimerRef.current = null;
    }, 6000);
  };

  const updateStudentAnswer = (next: string | ((current: string) => string)) => {
    const value = typeof next === "function" ? next(studentAnswerRef.current) : next;
    studentAnswerRef.current = value;
    setStudentAnswer(value);
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!mountedRef.current) return;
    setIsTranscribing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "matn-answer.webm");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : t("تعذر تحويل الصوت إلى نص، حاول مجددًا", "Could not transcribe the recording. Please try again."),
        );
      }

      const transcript = typeof payload?.text === "string" ? payload.text.trim() : "";
      if (!transcript) {
        setError(t("لم نتمكن من التقاط كلام واضح، حاول مجددًا", "No clear speech was detected. Please try again."));
        return;
      }
      updateStudentAnswer((currentText) =>
        currentText.trim() ? `${currentText.trim()} ${transcript}` : transcript,
      );
      textareaRef.current?.focus({ preventScroll: true });
    } catch (transcribeError) {
      if (!mountedRef.current) return;
      setError(
        transcribeError instanceof Error && transcribeError.message
          ? transcribeError.message
          : t("تعذر تحويل الصوت إلى نص، حاول مجددًا", "Could not transcribe the recording. Please try again."),
      );
    } finally {
      if (mountedRef.current) setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setIsListening(false);
    setIsTranscribing(true);
    try {
      recorder.stop();
    } catch (stopError) {
      console.error("MATN_RECORDING_STOP_ERROR:", stopError);
      recorderRef.current = null;
      stopStream();
      setIsTranscribing(false);
      setError(t("تعذر إيقاف التسجيل، حاول مجددًا", "Could not stop the recording. Please try again."));
    }
  };

  const handleRecordingStartError = (recordError: unknown) => {
    if (!mountedRef.current) return;
    setIsListening(false);
    setIsTranscribing(false);
    recorderRef.current = null;
    recordingChunksRef.current = [];
    stopStream();
    const errorName = recordError instanceof Error ? recordError.name : "";
    if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || errorName === "SecurityError") {
      const message = "يرجى السماح بصلاحية الميكروفون من إعدادات المتصفح للتسميع الصوتي";
      setError(message);
      showMicrophoneToast(message);
    } else if (recordError instanceof Error && recordError.message === "MICROPHONE_PERMISSION_TIMEOUT") {
      setError(t(
        "لم يصل ردّ على طلب الميكروفون. اسمح بالوصول من نافذة المتصفح ثم حاول مجددًا.",
        "The microphone request timed out. Allow access in the browser prompt, then try again.",
      ));
    } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
      setError(t("لم يتم العثور على ميكروفون متصل", "No microphone was found"));
    } else {
      console.error("MATN_RECORDING_START_ERROR:", recordError);
      setError(t("تعذر بدء التسجيل، تحقق من إعدادات الميكروفون وحاول مجددًا", "Could not start recording. Check your microphone settings and try again."));
    }
  };

  const startRecording = () => {
    if (startingRef.current || isListening || isTranscribing || isRequestingPermission) return;
    if (!recordSupported || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t("متصفحك لا يدعم التسجيل الصوتي. جرّب متصفحًا حديثًا.", "Your browser does not support audio recording. Try a recent browser."));
      return;
    }

    startingRef.current = true;
    setError(null);
    let streamRequest: Promise<MediaStream>;
    try {
      // Invoke getUserMedia directly in the click event's call stack, before
      // any permission query or await, so browsers can show their native prompt.
      streamRequest = navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (recordError) {
      startingRef.current = false;
      handleRecordingStartError(recordError);
      return;
    }

    setIsRequestingPermission(true);
    let permissionTimedOut = false;
    let permissionTimer: number | undefined;
    // If a browser leaves its permission prompt open past the deadline, stop
    // the stream if the user later grants access.
    void streamRequest.then((lateStream) => {
      if (permissionTimedOut) lateStream.getTracks().forEach((track) => track.stop());
    }).catch(() => undefined);
    const permissionTimeout = new Promise<MediaStream>((_, reject) => {
      permissionTimer = window.setTimeout(() => {
        permissionTimedOut = true;
        reject(new Error("MICROPHONE_PERMISSION_TIMEOUT"));
      }, 30_000);
    });

    void (async () => {
      try {
        const stream = await Promise.race([streamRequest, permissionTimeout]);
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const preferredMimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
          .find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
        const recorder = preferredMimeType
          ? new MediaRecorder(stream, { mimeType: preferredMimeType })
          : new MediaRecorder(stream);
        recorderRef.current = recorder;
        recordingChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recordingChunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(recordingChunksRef.current, {
            type: recorder.mimeType || recordingChunksRef.current[0]?.type || "audio/webm",
          });
          recordingChunksRef.current = [];
          recorderRef.current = null;
          stopStream();
          if (mountedRef.current) void transcribeAudio(blob);
        };
        recorder.onerror = () => {
          recorder.onstop = null;
          recorderRef.current = null;
          recordingChunksRef.current = [];
          stopStream();
          if (mountedRef.current) {
            setIsListening(false);
            setIsTranscribing(false);
            setError(t("حدث خطأ أثناء التسجيل، يرجى المحاولة مجددًا", "Recording failed. Please try again."));
          }
        };
        recorder.start(250);
        setIsListening(true);
      } catch (recordError) {
        handleRecordingStartError(recordError);
      } finally {
        if (permissionTimer !== undefined) window.clearTimeout(permissionTimer);
        startingRef.current = false;
        if (mountedRef.current) setIsRequestingPermission(false);
      }
    })();
  };

  const microphoneBusy = isListening || isTranscribing || isRequestingPermission;

  useEffect(() => {
    mountedRef.current = true;
    const supportFrame = window.requestAnimationFrame(() => {
      setRecordSupported(
        typeof navigator !== "undefined" &&
          typeof MediaRecorder !== "undefined" &&
          typeof navigator.mediaDevices?.getUserMedia === "function",
      );
    });
    return () => {
      mountedRef.current = false;
      window.cancelAnimationFrame(supportFrame);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }
      stopStream();
    };
  }, []);

  // Scroll every new card into view; focus the textarea only for free-writing
  // questions (the structured types have no single primary input).
  useEffect(() => {
    if (quizState !== "active") return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus({ preventScroll: true });
  }, [quizState, currentIndex]);

  if (totalQuestions === 0) {
    return (
      <div
        dir="rtl"
        className="w-full max-w-2xl rounded-2xl border border-gray-200/80 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <p className="font-bold text-gray-900 dark:text-white">
          {t("لا توجد أسئلة بعد", "No questions yet")}
        </p>
      </div>
    );
  }

  const current = questions[currentIndex];
  const isGraded = result !== null;
  const isLast = currentIndex === totalQuestions - 1;
  const progressPercent =
    quizState === "completed"
      ? 100
      : ((currentIndex + 1) / totalQuestions) * 100;

  const currentType = getQuestionType(current);
  const answerWords = current.correctAnswer.split(/\s+/).filter(Boolean);

  // --- Structured-question derivations (pure & stable across re-renders) ---
  // reorder: seeded scramble of word indices.
  const scrambleOrder = shuffleWithSeed(
    answerWords.map((_, index) => index),
    hashSeed(current.correctAnswer, currentIndex + 1),
  );
  // fill_blank: which word positions are hidden (indices ascending).
  const blankIndices = currentType === "fill_blank" ? computeBlankIndices(answerWords) : [];
  const blankPosition = new Map<number, number>(
    blankIndices.map((index, position) => [index, position]),
  );
  // mcq: option pool = correct answer + stored options, topped up from sibling
  // questions when fewer than 4, then shuffled into a stable display order.
  const optionPool: string[] = [];
  const pushOption = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length > 0 && !optionPool.includes(trimmed)) optionPool.push(trimmed);
  };
  if (currentType === "mcq") {
    pushOption(current.correctAnswer);
    if (Array.isArray(current.options)) {
      for (const option of current.options) if (typeof option === "string") pushOption(option);
    }
    if (optionPool.length < 4) {
      questions.forEach((question, index) => {
        if (index !== currentIndex && optionPool.length < 4) pushOption(question.correctAnswer);
      });
    }
  }
  const displayOptions =
    currentType === "mcq"
      ? shuffleWithSeed(
          optionPool.map((_, index) => index),
          hashSeed(current.correctAnswer, 7),
        ).map((index) => optionPool[index])
      : [];
  // Degenerate mcq (no usable distractors) falls back to free writing.
  const activeType: QuestionType =
    currentType === "mcq" && optionPool.length < 2 ? "write" : currentType;

  /** The text that will be verified (and graded if not an exact match). */
  const getSubmittedText = (): string => {
    if (activeType === "reorder") {
      return reorderPicks.map((index) => answerWords[index]).filter(Boolean).join(" ");
    }
    if (activeType === "fill_blank") {
      let position = 0;
      return answerWords
        .map((word, index) => {
          if (!blankPosition.has(index)) return word;
          const value = blankValues[position] ?? "";
          position += 1;
          return value.trim();
        })
        .join(" ");
    }
    if (activeType === "mcq") return (mcqChoice ?? "").trim();
    return studentAnswer.trim();
  };

  // State A: the bottom action stays disabled until the input is meaningful.
  const canSubmit =
    activeType === "reorder"
      ? answerWords.length > 0 && reorderPicks.length === answerWords.length
      : activeType === "fill_blank"
        ? blankIndices.length > 0 &&
          blankIndices.every((_, position) => (blankValues[position] ?? "").trim().length > 0)
        : activeType === "mcq"
          ? (mcqChoice ?? "").trim().length > 0
          : studentAnswer.trim().length > 0;

  const checkAnswer = () => {
    const text = getSubmittedText();
    if (text.length === 0 || isGrading || isGraded || microphoneBusy) return;

    // Instant client-side verification for the structured types: an exact
    // match (after Arabic normalization) is a guaranteed 100 with zero
    // latency — no round trip to /api/grade-matn.
    if (
      activeType !== "write" &&
      normalizeArabicText(text) === normalizeArabicText(current.correctAnswer)
    ) {
      const feedback = t(
        "ممتاز! إجابة صحيحة تمامًا — تصحيح فوري",
        "Perfect! Exact match — instant check",
      );
      setUserAnswers((prev) => ({
        ...prev,
        [currentIndex]: { text, score: 100, feedback, isPassed: true },
      }));
      setResult({ isPassed: true, score: 100, feedback });
      return;
    }

    setIsGrading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/grade-matn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentAnswer: text, correctAnswer: current.correctAnswer }),
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
        const graded = data as GradeMatnResult;
        const score = Math.min(100, Math.max(0, Math.round(graded.score)));
        const isPassed = score >= PASS_THRESHOLD;
        setUserAnswers((prev) => ({
          ...prev,
          [currentIndex]: { text, score, feedback: graded.feedback, isPassed },
        }));
        setResult({ ...graded, score, isPassed });
      } catch {
        setError(t("تعذر الاتصال بالخادم", "Could not reach the server"));
      } finally {
        setIsGrading(false);
      }
    })();
  };

  const goNext = () => {
    if (microphoneBusy) return;
    if (isLast) {
      setQuizState("completed");
      return;
    }
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
    updateStudentAnswer("");
    setReorderPicks([]);
    setBlankValues([]);
    setMcqChoice(null);
    setResult(null);
    setError(null);
  };

  const primaryAction = () => {
    if (microphoneBusy) return;
    if (isGraded) goNext();
    else checkAnswer();
  };

  const restartQuiz = () => {
    setUserAnswers({});
    setCurrentIndex(0);
    updateStudentAnswer("");
    setReorderPicks([]);
    setBlankValues([]);
    setMcqChoice(null);
    setResult(null);
    setError(null);
    setIsGrading(false);
    setQuizState("active");
  };

  // Ctrl+Enter / Cmd+Enter triggers Check Answer / Next Question from anywhere
  // inside the active card (the textarea is auto-focused on card entry).
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (quizState === "active" && !microphoneBusy) primaryAction();
    }
  };

  const overallScore = Math.round(
    Object.values(userAnswers).reduce((sum, answer) => sum + answer.score, 0) /
      totalQuestions,
  );
  const overallPassed = overallScore >= PASS_THRESHOLD;

  const cardMotion = {
    initial: { opacity: 0, x: 50, scale: 0.96 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -50, scale: 0.96 },
    transition: { type: "spring" as const, stiffness: 280, damping: 26 },
  };

  return (
    <div dir="rtl" className="w-full max-w-2xl mx-auto">
      <AnimatePresence>
        {microphoneToast && (
          <motion.div
            key="microphone-toast"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 bottom-4 z-[110] mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-800 shadow-lg dark:border-red-900 dark:bg-gray-900 dark:text-red-200"
            role="alert"
            aria-live="assertive"
          >
            <span className="flex-1">{microphoneToast}</span>
            <button
              type="button"
              onClick={() => {
                setMicrophoneToast(null);
                if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
              }}
              aria-label={t("إغلاق التنبيه", "Dismiss notification")}
              className="shrink-0 rounded px-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top progress bar (active/completed phases only) */}
      {quizState !== "welcome" && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>
              {quizState === "completed"
                ? t("اكتمل الاختبار", "Quiz complete")
                : t(
                    `السؤال ${currentIndex + 1} من ${totalQuestions}`,
                    `Question ${currentIndex + 1} of ${totalQuestions}`,
                  )}
            </span>
            <span dir="ltr">{Math.round(progressPercent)}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label={t("تقدم الاختبار", "Quiz progress")}
            className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
          >
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${progressPercent}%`, transition: "width 0.4s ease" }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {quizState === "welcome" && (
          <motion.div
            key="welcome"
            {...cardMotion}
            className="rounded-2xl border border-gray-200/80 bg-white px-6 py-10 text-center shadow-md dark:border-gray-800 dark:bg-gray-900 sm:px-8"
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Sparkles size={28} />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-gray-900 dark:text-white">
              {title || t("التسميع", "Recitation")}
            </h2>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ListChecks size={13} className="shrink-0" />
              {t(`عدد الأسئلة: ${totalQuestions}`, `Questions: ${totalQuestions}`)}
            </span>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-gray-600 dark:text-gray-400">
              {t(
                "راجع المتن سؤالًا بعد سؤال مع تصحيح فوري لكل إجابة — أنت قادر على النجاح، فالله معك",
                "Review the matn one question at a time with instant feedback — you've got this, God is with you",
              )}
            </p>
            <button
              type="button"
              onClick={() => setQuizState("active")}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              {t("ابدأ المراجعة 🚀", "Start Review 🚀")}
            </button>
          </motion.div>
        )}

        {quizState === "active" && (
          <motion.div
            key={`question-${currentIndex}`}
            ref={cardRef}
            {...cardMotion}
            onKeyDown={handleKeyDown}
            className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {currentIndex + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {t("السؤال", "Question")}
                </p>
                <p className="mt-1 text-sm font-medium leading-7 text-gray-900 dark:text-white">
                  {current.question}
                </p>
              </div>
            </div>

            {activeType === "write" && (
              <>
                <label
                  htmlFor="matn-answer"
                  className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("إجابتك", "Your answer")}
                </label>
                <div className="mt-2">
                  <textarea
                    id="matn-answer"
                    ref={textareaRef}
                    value={studentAnswer}
                    onChange={(event) => updateStudentAnswer(event.target.value)}
                    rows={5}
                    disabled={isGrading || microphoneBusy}
                    readOnly={isGraded}
                    placeholder={t("اكتب المتن هنا...", "Type the matn here...")}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-base leading-8 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <div className="mt-2 flex min-h-10 items-center gap-2">
                    <AnimatePresence mode="wait" initial={false}>
                      {isRequestingPermission ? (
                        <motion.div
                          key="microphone-permission"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.18 }}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          role="status"
                          aria-live="polite"
                        >
                          <Loader2 size={15} className="animate-spin" />
                          {t("في انتظار السماح بالوصول للميكروفون...", "Waiting for microphone permission...")}
                        </motion.div>
                      ) : isListening ? (
                        <motion.div
                          key="microphone-recording"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.18 }}
                          className="inline-flex items-center gap-2"
                          role="status"
                          aria-live="polite"
                        >
                          <SirajTooltip label={t("إيقاف التسجيل", "Stop recording")} side="top">
                            <button
                              type="button"
                              onClick={stopRecording}
                              aria-label={t("إيقاف التسجيل", "Stop recording")}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 transition-colors hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900"
                            >
                              <MicOff size={18} />
                            </button>
                          </SirajTooltip>
                          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            {t("جارٍ التسجيل...", "Recording...")}
                          </span>
                        </motion.div>
                      ) : isTranscribing ? (
                        <motion.div
                          key="microphone-transcribing"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.18 }}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          role="status"
                          aria-live="polite"
                        >
                          <Loader2 size={15} className="animate-spin" />
                          {t("جارٍ تحويل الصوت...", "Transcribing audio...")}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="microphone-idle"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.18 }}
                          className="inline-flex items-center gap-2"
                        >
                          <SirajTooltip
                            label={t("تحدث للإجابة", "Speak your answer")}
                            side="top"
                            disabled={!recordSupported || isGrading || isGraded}
                          >
                            <button
                              type="button"
                              onClick={startRecording}
                              disabled={!recordSupported || isGrading || isGraded}
                              aria-label={t("تحدث للإجابة", "Speak your answer")}
                              aria-describedby={!recordSupported ? "microphone-support-hint" : undefined}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900"
                            >
                              <Mic size={18} />
                            </button>
                          </SirajTooltip>
                          {!recordSupported && (
                            <span
                              id="microphone-support-hint"
                              className="text-xs text-gray-500 dark:text-gray-400"
                            >
                              {t("متصفحك لا يدعم التسجيل الصوتي", "Audio recording is not supported by this browser")}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            )}

            {activeType === "reorder" && (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <GripVertical size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {t(
                    "رتّب الكلمات لتكوين المقطع الصحيح",
                    "Arrange the words to form the correct passage",
                  )}
                </p>
                {/* The student's current arrangement (click a tile to remove it) */}
                <div className="mt-2 min-h-[3.5rem] rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                  {reorderPicks.length === 0 ? (
                    <p className="p-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                      {t(
                        "انقر الكلمات بالترتيب من لوحة الكلمات أدناه",
                        "Tap the words in order from the word bank below",
                      )}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {reorderPicks.map((wordIndex, position) => (
                        <button
                          key={`pick-${wordIndex}`}
                          type="button"
                          disabled={isGrading || isGraded}
                          onClick={() =>
                            setReorderPicks((prev) => prev.filter((_, pos) => pos !== position))
                          }
                          className="rounded-lg border border-emerald-500 bg-white px-2.5 py-1 text-sm font-bold text-emerald-700 shadow-sm transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60 dark:border-emerald-700 dark:bg-gray-900 dark:text-emerald-300"
                        >
                          {answerWords[wordIndex]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Remaining scrambled tiles */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {scrambleOrder
                    .filter((index) => !reorderPicks.includes(index))
                    .map((index) => (
                      <button
                        key={`bank-${index}`}
                        type="button"
                        disabled={isGrading || isGraded}
                        onClick={() => setReorderPicks((prev) => [...prev, index])}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                      >
                        {answerWords[index]}
                      </button>
                    ))}
                  {reorderPicks.length === answerWords.length && answerWords.length > 0 && (
                    <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 size={13} />
                      {t("اكتمل الترتيب", "Ordering complete")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeType === "fill_blank" && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("أكمل الكلمات الناقصة من المتن", "Complete the missing words of the matn")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 leading-9 dark:border-gray-700 dark:bg-gray-800">
                  {answerWords.map((word, index) => {
                    const position = blankPosition.get(index);
                    if (position === undefined) {
                      return (
                        <span key={`word-${index}`} className="text-base text-gray-900 dark:text-gray-100">
                          {word}
                        </span>
                      );
                    }
                    return (
                      <input
                        key={`blank-${index}`}
                        type="text"
                        value={blankValues[position] ?? ""}
                        disabled={isGrading || isGraded}
                        onChange={(event) =>
                          setBlankValues((prev) => {
                            const next = [...prev];
                            next[position] = event.target.value;
                            return next;
                          })
                        }
                        aria-label={t("كلمة ناقصة", "Missing word")}
                        style={{ width: `${Math.max(4, word.length + 2)}ch` }}
                        className="rounded-lg border-b-2 border-emerald-400 bg-emerald-50/80 px-1.5 text-center text-base text-gray-900 outline-none transition-colors focus:border-emerald-600 disabled:opacity-60 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-gray-100"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {activeType === "mcq" && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("اختر المقطع الصحيح من الخيارات", "Choose the correct passage from the options")}
                </p>
                <div className="mt-2 space-y-2">
                  {displayOptions.map((option, index) => {
                    const selected = mcqChoice === option;
                    return (
                      <button
                        key={`option-${index}`}
                        type="button"
                        disabled={isGrading || isGraded}
                        onClick={() => setMcqChoice(option)}
                        className={`flex w-full items-start gap-2.5 rounded-xl border-2 p-3 text-start transition-colors disabled:cursor-default ${
                          isGraded && selected
                            ? result?.isPassed
                              ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                              : "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40"
                            : selected
                              ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                              : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-800"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                            selected
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {OPTION_LETTERS[index] ?? index + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium leading-7 text-gray-900 dark:text-gray-100">
                          {option}
                        </span>
                        {selected && (
                          <CheckCircle2 size={18} className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            {result && (
              <div
                aria-live="polite"
                className={`mt-4 rounded-xl border p-4 ${
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
                      : t("راجع إجابتك وصححها", "Review and correct your answer")}
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
                      {current.correctAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={primaryAction}
              disabled={isGrading || microphoneBusy || (!isGraded && !canSubmit)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGrading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("جارٍ التصحيح...", "Grading...")}
                </>
              ) : isGraded ? (
                isLast ? (
                  t("عرض النتيجة النهائية 🎯", "Show Final Result 🎯")
                ) : (
                  <>
                    <ArrowLeft size={16} />
                    {t("السؤال التالي ←", "Next Question →")}
                  </>
                )
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {t("تحقق من الإجابة", "Check Answer")}
                </>
              )}
            </button>
          </motion.div>
        )}

        {quizState === "completed" && (
          <motion.div
            key="completed"
            {...cardMotion}
            onKeyDown={handleKeyDown}
            className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-6"
          >
            <div className="flex items-center gap-2">
              {overallPassed ? (
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle size={20} className="shrink-0 text-amber-500 dark:text-amber-400" />
              )}
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("النتيجة النهائية", "Final Result")}
              </h2>
            </div>

            <div
              aria-live="polite"
              className={`mt-4 rounded-xl border p-4 ${
                overallPassed
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-sm font-bold ${
                    overallPassed
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {overallPassed
                    ? t("أحسنت! تم اجتياز الاختبار", "Passed — well done!")
                    : t("تحتاج مراجعة بعض الإجابات", "Some answers need review")}
                </span>
                <span className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                  <span dir="ltr">{overallScore}%</span>
                </span>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {questions.map((question, index) => {
                const answer = userAnswers[index];
                const passed = (answer?.score ?? 0) >= PASS_THRESHOLD;
                return (
                  <li
                    key={question.question + index}
                    className={`flex gap-3 rounded-xl border p-3 ${
                      answer && answer.score < 100
                        ? "border-amber-200/70 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20"
                        : "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                        passed
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                        {question.question}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                        {answer
                          ? t("درجتك: ", "Your score: ") + `${answer.score}%`
                          : t("لم يُجب", "Unanswered")}
                      </p>
                      {answer?.feedback && (
                        <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                          {answer.feedback}
                        </p>
                      )}
                      {answer && answer.score < 100 && (
                        <div className="mt-1.5 rounded-lg border border-emerald-200/70 bg-white p-2 dark:border-gray-700 dark:bg-gray-900/80">
                          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            {t("النص الصحيح للمراجعة:", "Reference correct answer:")}
                          </p>
                          <p className="mt-0.5 text-xs font-medium leading-6 text-gray-900 dark:text-gray-100">
                            {question.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={restartQuiz}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-emerald-800 dark:hover:text-emerald-400"
            >
              <RotateCcw size={16} />
              {t("إعادة الاختبار", "Restart quiz")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
