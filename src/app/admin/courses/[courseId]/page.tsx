"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ArrowRight, BookPlus, Film, GraduationCap, ImagePlus, ListPlus, Trash2, Users } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { COURSE_PATHS, COURSE_PATH_LABELS } from "@/lib/course-paths";
import { formatDurationDetailed } from "@/lib/certificates/layout";
import { parseDurationFields, splitDuration } from "@/components/admin/format";
import DurationEditor from "@/components/admin/DurationEditor";
import PageHeader from "@/components/admin/PageHeader";
import { CardSkeleton, ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import SirajTooltip from "@/components/ui/SirajTooltip";
import CourseLessonsManager from "@/components/admin/CourseLessonsManager";
import CourseReferencesPicker from "@/components/admin/CourseReferencesPicker";
import type { AdminCertificate, AdminExam, Course } from "@/components/admin/types";

type Tab = "info" | "content" | "exams" | "students" | "settings";

const TABS: { key: Tab; ar: string; en: string }[] = [
  { key: "info", ar: "معلومات الدورة", en: "Course info" },
  { key: "content", ar: "المحتوى", en: "Content" },
  { key: "exams", ar: "الاختبارات", en: "Exams" },
  { key: "students", ar: "الطلاب", en: "Students" },
  { key: "settings", ar: "الإعدادات", en: "Settings" },
];

export default function AdminCourseEditorPage() {
  const params = useParams();
  const courseId = typeof params.courseId === "string" ? params.courseId : "";
  const { t } = useLang();
  const router = useRouter();
  const { dialog, notify } = useSirajMessage();
  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [editForm, setEditForm] = useState({
    titleAr: "",
    titleEn: "",
    shortDescriptionAr: "",
    shortDescriptionEn: "",
    coverImageUrl: "",
    path: "BEGINNER",
    instructorNameAr: "",
    instructorNameEn: "",
    libraryItemIds: [] as string[],
  });
  const [editCourseImage, setEditCourseImage] = useState<File | null>(null);
  // Manual course duration editor fields. `durationTouched` tracks whether the
  // admin edited them: untouched saves preserve the stored value exactly
  // (even sub-minute ones the hour/minute inputs cannot represent).
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [durationTouched, setDurationTouched] = useState(false);
  const [lessonForm, setLessonForm] = useState({ titleAr: "", titleEn: "", videoUrl: "" });
  const [lessonVideo, setLessonVideo] = useState<File | null>(null);
  const [lessonVideoSeconds, setLessonVideoSeconds] = useState<number | null>(null);
  const [refreshingDuration, setRefreshingDuration] = useState(false);
  const initializedFor = useRef("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [coursesRes, examsRes, certsRes] = await Promise.all([
        fetch("/api/admin/courses"),
        fetch("/api/admin/exams"),
        fetch("/api/admin/certificates"),
      ]);
      if (!coursesRes.ok || !examsRes.ok || !certsRes.ok) throw new Error("load failed");
      const coursesData = await coursesRes.json();
      setCourses(Array.isArray(coursesData) ? coursesData : (coursesData.courses ?? []));
      setExams(await examsRes.json());
      setCertificates(await certsRes.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const course = courses.find((c) => c.id === courseId) ?? null;

  useEffect(() => {
    if (course && initializedFor.current !== course.id) {
      initializedFor.current = course.id;
      setEditForm({
        titleAr: course.titleAr,
        titleEn: course.titleEn,
        shortDescriptionAr: course.shortDescriptionAr ?? "",
        shortDescriptionEn: course.shortDescriptionEn ?? "",
        coverImageUrl: course.coverImageUrl ?? "",
        path: course.path,
        instructorNameAr: course.instructorNameAr ?? "",
        instructorNameEn: course.instructorNameEn ?? "",
        libraryItemIds: course.libraryReferences?.map((ref) => ref.libraryItemId) ?? [],
      });
      setEditCourseImage(null);
      const split = splitDuration(course.durationSeconds);
      setDurationHours(split.hours);
      setDurationMinutes(split.minutes);
      setDurationTouched(false);
    }
  }, [course]);

  const uploadFile = async (file: File, kind: "image" | "video" | "document") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error ?? "upload failed");
    }
    return (await response.json()).url as string;
  };

  // Capture the uploaded file's own length from its metadata (never typed by
  // hand): sent with the lesson payload so hosted videos get a real duration.
  const handleLessonVideo = (file: File | null) => {
    setLessonVideo(file);
    setLessonVideoSeconds(null);
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration >= 0) {
        setLessonVideoSeconds(Math.floor(probe.duration));
      }
      URL.revokeObjectURL(objectUrl);
    };
    probe.onerror = () => URL.revokeObjectURL(objectUrl);
    probe.src = objectUrl;
  };

  const submitEditCourse = async (event: FormEvent) => {
    event.preventDefault();
    if (!course) return;
    // Manual duration: untouched fields preserve the stored value exactly;
    // edited fields must be valid hours (>= 0) and minutes (0–59).
    const manualDuration = durationTouched
      ? parseDurationFields(durationHours, durationMinutes)
      : (course.durationSeconds ?? null);
    if (manualDuration === "INVALID") {
      notify(t("مدة الدورة غير صحيحة: أدخل ساعات ≥ 0 ودقائق من 0 إلى 59", "Invalid course duration: enter hours ≥ 0 and minutes 0–59"), "error");
      return;
    }
    try {
      const coverImageUrl = editCourseImage ? await uploadFile(editCourseImage, "image") : editForm.coverImageUrl;
      const payload = {
        titleAr: editForm.titleAr,
        titleEn: editForm.titleEn,
        shortDescriptionAr: editForm.shortDescriptionAr,
        shortDescriptionEn: editForm.shortDescriptionEn,
        coverImageUrl,
        path: editForm.path,
        instructorNameAr: editForm.instructorNameAr,
        instructorNameEn: editForm.instructorNameEn,
        libraryItemIds: editForm.libraryItemIds,
        durationSeconds: manualDuration,
      };
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      notify(response.ok ? t("تم تحديث الدورة", "Course updated") : (result?.error ?? t("تعذر تحديث الدورة", "Could not update course")), response.ok ? "success" : "error");
      if (response.ok) {
        setEditCourseImage(null);
        await loadAll();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : t("تعذر رفع الصورة", "Could not upload image"), "error");
    }
  };

  const submitLesson = async (event: FormEvent) => {
    event.preventDefault();
    if (!course) return;
    try {
      const videoUrl = lessonVideo ? await uploadFile(lessonVideo, "video") : lessonForm.videoUrl;
      const response = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lessonForm, courseId: course.id, videoUrl, videoDurationSeconds: lessonVideo ? lessonVideoSeconds : undefined }),
      });
      const result = await response.json().catch(() => null);
      notify(response.ok ? t("تمت إضافة الدرس", "Lesson added") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
      if (response.ok) {
        setLessonForm({ titleAr: "", titleEn: "", videoUrl: "" });
        setLessonVideo(null);
        setLessonVideoSeconds(null);
        await loadAll();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : t("تعذر رفع الفيديو", "Could not upload video"), "error");
    }
  };

  // Recompute a course's video total (missing YouTube lengths refetched;
  // force also refreshes cached ones). Public pages never trigger this.
  const refreshCourseDuration = async (id: string, force: boolean) => {
    setRefreshingDuration(true);
    try {
      const response = await fetch(`/api/admin/courses/${id}/refresh-duration${force ? "?force=1" : ""}`, { method: "POST" });
      const result = await response.json().catch(() => null);
      notify(response.ok ? t("تم تحديث مدة الدورة", "Course duration refreshed") : (result?.error ?? t("تعذر تحديث المدة", "Could not refresh duration")), response.ok ? "success" : "error");
      if (response.ok) await loadAll();
    } finally {
      setRefreshingDuration(false);
    }
  };

  const deleteCourse = async () => {
    if (!course) return;
    if (!window.confirm(`${t("هل تريد حذف دورة", "Delete course")} "${course.titleAr}"؟`)) return;
    const response = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف الدورة", "Course deleted") : (result?.error ?? t("تعذر حذف الدورة", "Could not delete course")), response.ok ? "success" : "error");
    if (response.ok) router.push("/admin/courses");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton lines={2} />
        <ListSkeleton rows={5} />
      </div>
    );
  }

  if (loadError || !course) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {loadError ? t("تعذر تحميل الدورة.", "Could not load the course.") : t("الدورة غير موجودة.", "Course not found.")}
        </p>
        <div className="flex justify-center gap-2">
          {loadError && (
            <button type="button" onClick={() => void loadAll()} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          )}
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
          >
            <ArrowRight size={16} className="rtl:rotate-180" />
            {t("عودة للدورات", "Back to courses")}
          </Link>
        </div>
      </div>
    );
  }

  const courseExams = exams.filter((exam) => exam.courseId === course.id);
  const courseCerts = certificates.filter((cert) => cert.course.id === course.id);
  const totalAttempts = courseExams.reduce((sum, exam) => sum + exam.attemptCount, 0);

  return (
    <div>
      <PageHeader
        title={course.titleAr}
        subtitle={t("تعديل دورة كاملة", "Edit the full course")}
        actions={
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
          >
            <ArrowRight size={16} className="rtl:rotate-180" />
            {t("الدورات", "Courses")}
          </Link>
        }
      />

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" role="tablist" aria-label={t("أقسام الدورة", "Course sections")}>
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-150 ${
              tab === item.key
                ? "bg-emerald-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {t(item.ar, item.en)}
            {item.key === "content" && <span className="ms-1.5 text-xs opacity-80">({course.lessons.length})</span>}
            {item.key === "exams" && <span className="ms-1.5 text-xs opacity-80">({courseExams.length})</span>}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <form onSubmit={(e) => void submitEditCourse(e)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookPlus size={18} />
            {t("معلومات الدورة", "Course info")}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              {t("المدة المحسوبة من الفيديوهات", "Computed video duration")}: <strong>{formatDurationDetailed(course.computedDurationSeconds ?? null)}</strong>
            </span>
            <button type="button" disabled={refreshingDuration} onClick={() => void refreshCourseDuration(course.id, false)} className="text-xs px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 disabled:opacity-40">
              {t("إعادة حساب المدة", "Recompute duration")}
            </button>
            <SirajTooltip label={t("إعادة جلب مدد فيديوهات YouTube من جديد", "Refetch YouTube video lengths")} side="top">
              <button type="button" disabled={refreshingDuration} onClick={() => void refreshCourseDuration(course.id, true)} className="text-xs px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40">
                {t("تحديث قسري", "Force refresh")}
              </button>
            </SirajTooltip>
          </div>
          <DurationEditor
            hours={durationHours}
            minutes={durationMinutes}
            onChange={(h, m) => {
              setDurationHours(h);
              setDurationMinutes(m);
              setDurationTouched(true);
            }}
            t={t}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input required placeholder={t("العنوان بالعربية", "Arabic title")} aria-label={t("العنوان بالعربية", "Arabic title")} value={editForm.titleAr} onChange={(e) => setEditForm({ ...editForm, titleAr: e.target.value })} className="admin-input" />
            <input placeholder={t("العنوان بالإنجليزية", "English title")} aria-label={t("العنوان بالإنجليزية", "English title")} value={editForm.titleEn} onChange={(e) => setEditForm({ ...editForm, titleEn: e.target.value })} className="admin-input" />
          </div>
          <textarea placeholder={t("الوصف بالعربية", "Arabic description")} aria-label={t("الوصف بالعربية", "Arabic description")} value={editForm.shortDescriptionAr} onChange={(e) => setEditForm({ ...editForm, shortDescriptionAr: e.target.value })} className="admin-input min-h-20" />
          <textarea placeholder={t("الوصف بالإنجليزية", "English description")} aria-label={t("الوصف بالإنجليزية", "English description")} value={editForm.shortDescriptionEn} onChange={(e) => setEditForm({ ...editForm, shortDescriptionEn: e.target.value })} className="admin-input min-h-20" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-course-path" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t("المسار", "Path")}</label>
              <select id="edit-course-path" required value={editForm.path} onChange={(e) => setEditForm({ ...editForm, path: e.target.value })} className="admin-input">
                {COURSE_PATHS.map((key) => (
                  <option key={key} value={key}>
                    {t(COURSE_PATH_LABELS[key].ar, COURSE_PATH_LABELS[key].en)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t("المعلم", "Instructor")}</label>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder={t("اسم المعلم بالعربية", "Instructor name (Arabic)")} aria-label={t("اسم المعلم بالعربية", "Instructor name (Arabic)")} value={editForm.instructorNameAr} onChange={(e) => setEditForm({ ...editForm, instructorNameAr: e.target.value })} className="admin-input" />
                <input placeholder={t("اسم المعلم بالإنجليزية", "Instructor name (English)")} aria-label={t("اسم المعلم بالإنجليزية", "Instructor name (English)")} value={editForm.instructorNameEn} onChange={(e) => setEditForm({ ...editForm, instructorNameEn: e.target.value })} className="admin-input" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("المراجع والمصادر", "References & Sources")}</h3>
            <CourseReferencesPicker value={editForm.libraryItemIds} onChange={(ids) => setEditForm({ ...editForm, libraryItemIds: ids })} />
          </div>
          <input placeholder={t("مسار الصورة", "Image path")} aria-label={t("مسار الصورة", "Image path")} value={editForm.coverImageUrl} onChange={(e) => setEditForm({ ...editForm, coverImageUrl: e.target.value })} className="admin-input" />
          <SirajTooltip label={t("اختر صورة جديدة للدورة", "Choose a new course image")} side="top" className="w-full">
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("اختر صورة جديدة للدورة", "Choose a new course image")} onChange={(e) => setEditCourseImage(e.target.files?.[0] ?? null)} className="admin-input" />
          </SirajTooltip>
          <div>
            <button type="submit" className="admin-button sm:w-auto sm:px-8">
              <ImagePlus size={16} />
              {t("حفظ التعديلات", "Save changes")}
            </button>
          </div>
        </form>
      )}

      {tab === "content" && (
        <div className="space-y-4">
          <form onSubmit={(e) => void submitLesson(e)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Film size={18} />
              {t("إضافة درس وفيديو", "Add lesson and video")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required placeholder={t("عنوان الدرس", "Lesson title")} aria-label={t("عنوان الدرس", "Lesson title")} value={lessonForm.titleAr} onChange={(e) => setLessonForm({ ...lessonForm, titleAr: e.target.value })} className="admin-input" />
              <input placeholder={t("عنوان الدرس بالإنجليزية", "English lesson title")} aria-label={t("عنوان الدرس بالإنجليزية", "English lesson title")} value={lessonForm.titleEn} onChange={(e) => setLessonForm({ ...lessonForm, titleEn: e.target.value })} className="admin-input" />
            </div>
            <input placeholder="YouTube أو /videos/file.mp4" aria-label="YouTube أو /videos/file.mp4" value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} className="admin-input" dir="ltr" />
            <SirajTooltip label={t("اختر ملف فيديو الدرس", "Choose the lesson video file")} side="top" className="w-full">
              <input type="file" accept="video/mp4,video/webm,video/quicktime" aria-label={t("اختر ملف فيديو الدرس", "Choose the lesson video file")} onChange={(e) => handleLessonVideo(e.target.files?.[0] ?? null)} className="admin-input" />
            </SirajTooltip>
            <div>
              <button className="admin-button sm:w-auto sm:px-8">
                <ListPlus size={16} />
                {t("حفظ الدرس", "Save lesson")}
              </button>
            </div>
          </form>
          <CourseLessonsManager
            key={course.id}
            courseId={course.id}
            lessons={course.lessons}
            exams={exams.filter((exam) => exam.courseId === course.id).map((exam) => ({ id: exam.id, lessonId: exam.lessonId, titleAr: exam.titleAr }))}
            onChanged={loadAll}
            notify={notify}
          />
        </div>
      )}

      {tab === "exams" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GraduationCap size={18} />
              {t("اختبارات الدورة", "Course exams")} ({courseExams.length})
            </h2>
            <Link
              href="/admin/exams"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-150"
            >
              {t("إدارة الاختبارات", "Manage exams")}
            </Link>
          </div>
          {courseExams.length > 0 ? (
            <div className="space-y-2">
              {courseExams.map((exam, index) => (
                <div key={exam.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{exam.titleAr}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {exam.lesson ? exam.lesson.titleAr : t("بدون درس مرتبط", "No linked lesson")} · {exam.questionCount} {t("أسئلة", "questions")} ·{" "}
                      {exam.available ? t("متاح", "Available") : t("غير مكتمل", "Incomplete")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد اختبارات لهذه الدورة بعد.", "No exams for this course yet.")}</p>
          )}
        </div>
      )}

      {tab === "students" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Users size={18} />
            {t("طلاب الدورة", "Course students")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("شهادات صادرة لهذه الدورة", "Certificates issued for this course")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{courseCerts.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("محاولات الاختبارات", "Exam attempts")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalAttempts}</p>
            </div>
          </div>
          {courseCerts.length > 0 ? (
            <div className="space-y-2">
              {courseCerts.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <div className="min-w-0">
                    <span className="block text-gray-900 dark:text-white truncate">{cert.student.fullName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{cert.certificateCode} · {new Date(cert.issueDate).toLocaleDateString("ar")}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{cert.student.email}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد شهادات صادرة لهذه الدورة بعد.", "No certificates issued for this course yet.")}</p>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-gray-900 dark:text-white">{t("إعدادات الدورة", "Course settings")}</h2>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <span className="block text-xs text-gray-500 mb-1">{t("المسار", "Path")}</span>
              <span className="text-gray-900 dark:text-white">{t(COURSE_PATH_LABELS[course.path as keyof typeof COURSE_PATH_LABELS]?.ar ?? course.path, COURSE_PATH_LABELS[course.path as keyof typeof COURSE_PATH_LABELS]?.en ?? course.path)}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <span className="block text-xs text-gray-500 mb-1">{t("الدروس", "Lessons")}</span>
              <span className="text-gray-900 dark:text-white">{course.lessons.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <span className="block text-xs text-gray-500 mb-1">{t("الاختبارات", "Exams")}</span>
              <span className="text-gray-900 dark:text-white">{courseExams.length}</span>
            </div>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 p-4">
            <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">{t("منطقة الخطر", "Danger zone")}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t("حذف الدورة يزيل كل محتواها ودروسها واختباراتها.", "Deleting the course removes all of its content, lessons and exams.")}</p>
            <button
              type="button"
              onClick={() => void deleteCourse()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors duration-150"
            >
              <Trash2 size={15} />
              {t("حذف الدورة", "Delete course")}
            </button>
          </div>
        </div>
      )}
      <SirajDialog {...dialog} />
    </div>
  );
}
