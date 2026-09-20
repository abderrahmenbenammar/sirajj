"use client";

import { Fragment, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Clock, Film, GraduationCap, GripVertical, Trash2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import SirajTooltip from "@/components/ui/SirajTooltip";
import SirajDialog, { useSirajConfirm, type SirajDialogType } from "@/components/ui/SirajDialog";

export type CourseLesson = {
  id: string;
  titleAr: string;
  titleEn: string;
  orderIndex: number;
  videoUrl: string;
  videoDurationSeconds: number | null;
};

function formatShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type LessonExamRef = { id: string; lessonId: string | null; titleAr: string };

type Notify = (message: string, type?: SirajDialogType, title?: string) => void;

function videoLabel(videoUrl: string, t: (ar: string, en: string) => string) {
  return /youtu\.?be/i.test(videoUrl) ? t("يوتيوب", "YouTube") : t("فيديو", "Video");
}

export default function CourseLessonsManager({
  courseId,
  lessons,
  exams,
  onChanged,
  notify,
}: {
  courseId: string;
  lessons: CourseLesson[];
  exams: LessonExamRef[];
  onChanged: () => Promise<void>;
  notify: Notify;
}) {
  const { t } = useLang();
  const { dialog, confirm } = useSirajConfirm();
  const [items, setItems] = useState<CourseLesson[]>(lessons);
  const [snapshot, setSnapshot] = useState<CourseLesson[]>(lessons);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const busyRef = useRef(false);

  // Adopt the parent's freshly loaded order (React's "adjust state when a prop
  // changes" pattern) instead of a setState-in-effect that cascades renders.
  if (snapshot !== lessons) {
    setSnapshot(lessons);
    setItems(lessons);
  }

  const examsFor = (lessonId: string) => exams.filter((exam) => exam.lessonId === lessonId);

  const persistOrder = async (next: CourseLesson[], previous: CourseLesson[]) => {
    busyRef.current = true;
    setSaving(true);
    setItems(next);
    try {
      const response = await fetch("/api/admin/lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonIds: next.map((lesson) => lesson.id) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? t("تعذر حفظ الترتيب", "Could not save the order"));
      await onChanged();
      notify(t("تم حفظ ترتيب الدروس", "Lesson order saved"), "success");
    } catch (error) {
      setItems(previous);
      notify(error instanceof Error ? error.message : t("تعذر حفظ الترتيب", "Could not save the order"), "error");
    } finally {
      setSaving(false);
      busyRef.current = false;
    }
  };

  const handleDrop = async (targetIndex: number) => {
    const currentDragId = dragId;
    setDragId(null);
    setOverIndex(null);
    if (!currentDragId || saving) return;
    const fromIndex = items.findIndex((lesson) => lesson.id === currentDragId);
    if (fromIndex === -1) return;
    if (targetIndex === fromIndex || targetIndex === fromIndex + 1) return;
    const previous = items;
    const without = items.filter((lesson) => lesson.id !== currentDragId);
    const insertAt = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
    const next = [...without.slice(0, insertAt), items[fromIndex], ...without.slice(insertAt)];
    if (next.every((lesson, index) => lesson.id === previous[index]?.id)) return;
    await persistOrder(next, previous);
  };

  const handleDragOver = (event: DragEvent, index: number) => {
    if (!dragId || saving) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    const nextOver = before ? index : index + 1;
    if (overIndex !== nextOver) setOverIndex(nextOver);
  };

  const removeLesson = async (lesson: CourseLesson) => {
    if (busyRef.current || deletingId) return;
    const linked = examsFor(lesson.id);
    const message =
      `${t("هل تريد حذف درس", "Delete lesson")} "${lesson.titleAr}"؟` +
      (linked.length
        ? `\n${t(
            "الاختبار المرتبط سيُفصل عن الدرس ويبقى محفوظًا مع نتائجه، بينما تُحذف سجلات إكمال هذا الدرس فقط.",
            "The linked exam will be detached and kept with its results; only this lesson's completion records are removed."
          )}`
        : "");
    const accepted = await confirm(message, {
      type: "warning",
      confirmLabel: t("حذف", "Delete"),
      cancelLabel: t("إلغاء", "Cancel"),
      confirmVariant: "danger",
    });
    if (!accepted) return;
    busyRef.current = true;
    setDeletingId(lesson.id);
    try {
      const response = await fetch(`/api/admin/lessons/${lesson.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? t("تعذر حذف الدرس", "Could not delete the lesson"));
      await onChanged();
      notify(t("تم حذف الدرس", "Lesson deleted"), "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : t("تعذر حذف الدرس", "Could not delete the lesson"), "error");
    } finally {
      setDeletingId("");
      busyRef.current = false;
    }
  };

  const indicator = (index: number) =>
    overIndex === index && dragId ? (
      <li aria-hidden="true" className="h-1 rounded-full bg-emerald-500" />
    ) : null;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Film size={16} className="text-emerald-600 dark:text-emerald-400" />
          {t("دروس الدورة", "Course lessons")}
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({items.length})</span>
        </h4>
        {saving && <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("جارٍ حفظ الترتيب...", "Saving order...")}</span>}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد دروس في هذه الدورة بعد.", "No lessons in this course yet.")}</p>
      ) : (
        <ul className={`space-y-2 ${saving ? "opacity-70 pointer-events-none" : ""}`}>
          {indicator(0)}
          {items.map((lesson, index) => {
            const linked = examsFor(lesson.id);
            return (
              <Fragment key={lesson.id}>
                <li
                  draggable={!saving && !deletingId}
                  onDragStart={(event) => {
                    if (saving || deletingId) return;
                    setDragId(lesson.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", lesson.id);
                  }}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDrop(overIndex ?? index);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverIndex(null);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${
                    dragId === lesson.id ? "opacity-50" : ""
                  }`}
                >
                  <SirajTooltip label={t("اسحب لتغيير ترتيب الدرس", "Drag to reorder this lesson")} side="top">
                    <span className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 touch-none" aria-hidden="true">
                      <GripVertical size={18} />
                    </span>
                  </SirajTooltip>

                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lesson.titleAr}</p>
                    {lesson.titleEn && <p className="text-xs text-gray-500 dark:text-gray-400 truncate" dir="ltr">{lesson.titleEn}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <Film size={11} />
                        {videoLabel(lesson.videoUrl, t)}
                      </span>
                      {typeof lesson.videoDurationSeconds === "number" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                          <Clock size={11} />
                          {formatShort(lesson.videoDurationSeconds)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400">
                          <Clock size={11} />
                          {t("بلا مدة", "No length")}
                        </span>
                      )}
                      {linked.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                          <GraduationCap size={11} />
                          {linked.length > 1 ? `${t("اختبارات", "Exams")} (${linked.length})` : t("اختبار", "Exam")}
                        </span>
                      )}
                    </div>
                  </div>

                  <SirajTooltip label={t("حذف هذا الدرس فقط", "Delete this lesson only")} side="top">
                    <button
                      type="button"
                      onClick={() => removeLesson(lesson)}
                      disabled={saving || deletingId === lesson.id}
                      className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
                      aria-label={`${t("حذف", "Delete")} ${lesson.titleAr}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </SirajTooltip>
                </li>
                {indicator(index + 1)}
              </Fragment>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        {t("اسحب وأفلت لإعادة ترتيب الدروس — يُحفظ الترتيب تلقائيًا.", "Drag and drop to reorder lessons — the order is saved automatically.")}
      </p>

      <SirajDialog {...dialog} />
    </div>
  );
}
