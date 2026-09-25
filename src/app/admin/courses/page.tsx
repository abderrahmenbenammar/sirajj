"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";
import { BookPlus, Eye, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { COURSE_PATHS, COURSE_PATH_LABELS } from "@/lib/course-paths";
import { formatDurationShort, parseDurationFields } from "@/components/admin/format";
import DurationEditor from "@/components/admin/DurationEditor";
import PageHeader from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import SirajTooltip from "@/components/ui/SirajTooltip";
import CourseReferencesPicker from "@/components/admin/CourseReferencesPicker";
import { EMPTY_COURSE_FORM, type Course } from "@/components/admin/types";

export default function AdminCoursesPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [pathFilter, setPathFilter] = useState("ALL");
  const [courseForm, setCourseForm] = useState({ ...EMPTY_COURSE_FORM, libraryItemIds: [] as string[] });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/admin/courses");
      if (!response.ok) throw new Error("load failed");
      const data = await response.json();
      const list: Course[] = Array.isArray(data) ? data : (data.courses ?? []);
      setCourses(list);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

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

  const submitCourse = async (event: FormEvent) => {
    event.preventDefault();
    const manualDuration = parseDurationFields(durationHours, durationMinutes);
    if (manualDuration === "INVALID") {
      notify(t("مدة الدورة غير صحيحة: أدخل ساعات ≥ 0 ودقائق من 0 إلى 59", "Invalid course duration: enter hours ≥ 0 and minutes 0–59"), "error");
      return;
    }
    try {
      const coverImageUrl = courseImage ? await uploadFile(courseImage, "image") : courseForm.coverImageUrl;
      const payload = {
        titleAr: courseForm.titleAr,
        titleEn: courseForm.titleEn,
        shortDescriptionAr: courseForm.shortDescriptionAr,
        shortDescriptionEn: courseForm.shortDescriptionEn,
        coverImageUrl,
        path: courseForm.path,
        instructorNameAr: courseForm.instructorNameAr,
        instructorNameEn: courseForm.instructorNameEn,
        libraryItemIds: courseForm.libraryItemIds,
        durationSeconds: manualDuration,
      };
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      notify(response.ok ? t("تمت إضافة الدورة", "Course added") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
      if (response.ok) {
        setCourseImage(null);
        setCourseForm({ ...EMPTY_COURSE_FORM, libraryItemIds: [] as string[] });
        setDurationHours("");
        setDurationMinutes("");
        await loadCourses();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : t("تعذر رفع الصورة", "Could not upload image"), "error");
    }
  };

  const deleteCourse = async (course: Course) => {
    if (!window.confirm(`${t("هل تريد حذف دورة", "Delete course")} "${course.titleAr}"؟`)) return;
    const response = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف الدورة", "Course deleted") : (result?.error ?? t("تعذر حذف الدورة", "Could not delete course")), response.ok ? "success" : "error");
    if (response.ok) await loadCourses();
  };

  const query = search.trim().toLowerCase();
  const visible = courses.filter(
    (course) =>
      (pathFilter === "ALL" || course.path === pathFilter) &&
      (!query ||
        course.titleAr.toLowerCase().includes(query) ||
        course.titleEn.toLowerCase().includes(query) ||
        (course.instructorNameAr ?? "").toLowerCase().includes(query) ||
        (course.instructorNameEn ?? "").toLowerCase().includes(query))
  );

  return (
    <div>
      <PageHeader
        title={t("الدورات", "Courses")}
        subtitle={t("إدارة دورات منصة سراج", "Manage Siraj platform courses")}
        actions={
          <a href="#add-course" className="admin-button w-auto px-5">
            <Plus size={16} />
            {t("إضافة دورة", "Add course")}
          </a>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("بحث عن دورة...", "Search courses...")} aria-label={t("بحث عن دورة...", "Search courses...")}
          className="admin-input sm:flex-1"
        />
        <select aria-label={t("تصفية حسب المسار", "Filter by path")} value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} className="admin-input sm:w-52">
          <option value="ALL">{t("كل المسارات", "All paths")}</option>
          {COURSE_PATHS.map((key) => (
            <option key={key} value={key}>
              {t(COURSE_PATH_LABELS[key].ar, COURSE_PATH_LABELS[key].en)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : loadError ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل الدورات.", "Could not load courses.")}</p>
          <button type="button" onClick={() => void loadCourses()} className="admin-button w-auto px-6">
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          {visible.length > 0 ? (
            <div className="space-y-2">
              {visible.map((course) => (
                <div key={course.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  {course.coverImageUrl ? (
                    <img src={course.coverImageUrl} alt="" className="w-12 h-16 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
                  ) : (
                    <span className="w-12 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-400">
                      <BookPlus size={18} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{course.titleAr}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                      {course.instructorNameAr || course.instructorNameEn || t("بدون مدرّس", "No instructor")} ·{" "}
                      {t(COURSE_PATH_LABELS[course.path as keyof typeof COURSE_PATH_LABELS]?.ar ?? course.path, COURSE_PATH_LABELS[course.path as keyof typeof COURSE_PATH_LABELS]?.en ?? course.path)} ·{" "}
                      {course.lessons.length} {t("دروس", "lessons")} · {t("المدة", "Duration")}: {formatDurationShort(course.durationSeconds, t)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SirajTooltip label={t("فتح بيانات الدورة لتعديلها", "Open the course data for editing")} side="top">
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60"
                        aria-label={`${t("تعديل", "Edit")} ${course.titleAr}`}
                      >
                        <BookPlus size={14} />
                        {t("تعديل", "Edit")}
                      </Link>
                    </SirajTooltip>
                    <SirajTooltip label={t("عرض الدورة", "View course")} side="top">
                      <Link
                        href={`/courses/${course.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                        aria-label={`${t("عرض", "View")} ${course.titleAr}`}
                      >
                        <Eye size={14} />
                        {t("عرض", "View")}
                      </Link>
                    </SirajTooltip>
                    <SirajTooltip label={t("حذف الدورة مع كل محتواها ودروسها", "Delete the course and all its lessons and content")} side="top">
                      <button
                        type="button"
                        onClick={() => void deleteCourse(course)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-950/40 dark:hover:bg-red-950/60"
                        aria-label={`${t("حذف", "Delete")} ${course.titleAr}`}
                      >
                        <Trash2 size={14} />
                        {t("حذف", "Delete")}
                      </button>
                    </SirajTooltip>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد دورات مطابقة.", "No matching courses.")}</p>
          )}
        </div>
      )}

      <div id="add-course" className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 scroll-mt-24">
        <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-4">
          <BookPlus size={18} />
          {t("إضافة دورة", "Add course")}
        </h2>
        <form onSubmit={(e) => void submitCourse(e)} className="grid sm:grid-cols-2 gap-3">
          <input required placeholder={t("العنوان بالعربية", "Arabic title")} aria-label={t("العنوان بالعربية", "Arabic title")} value={courseForm.titleAr} onChange={(e) => setCourseForm({ ...courseForm, titleAr: e.target.value })} className="admin-input" />
          <input placeholder={t("العنوان بالإنجليزية", "English title")} aria-label={t("العنوان بالإنجليزية", "English title")} value={courseForm.titleEn} onChange={(e) => setCourseForm({ ...courseForm, titleEn: e.target.value })} className="admin-input" />
          <textarea placeholder={t("الوصف بالعربية", "Arabic description")} aria-label={t("الوصف بالعربية", "Arabic description")} value={courseForm.shortDescriptionAr} onChange={(e) => setCourseForm({ ...courseForm, shortDescriptionAr: e.target.value })} className="admin-input min-h-20" />
          <textarea placeholder={t("الوصف بالإنجليزية", "English description")} aria-label={t("الوصف بالإنجليزية", "English description")} value={courseForm.shortDescriptionEn} onChange={(e) => setCourseForm({ ...courseForm, shortDescriptionEn: e.target.value })} className="admin-input min-h-20" />
          <div>
            <label htmlFor="add-course-path" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t("المسار", "Path")}</label>
            <select id="add-course-path" required value={courseForm.path} onChange={(e) => setCourseForm({ ...courseForm, path: e.target.value })} className="admin-input">
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
              <input placeholder={t("اسم المعلم بالعربية", "Instructor name (Arabic)")} aria-label={t("اسم المعلم بالعربية", "Instructor name (Arabic)")} value={courseForm.instructorNameAr} onChange={(e) => setCourseForm({ ...courseForm, instructorNameAr: e.target.value })} className="admin-input" />
              <input placeholder={t("اسم المعلم بالإنجليزية", "Instructor name (English)")} aria-label={t("اسم المعلم بالإنجليزية", "Instructor name (English)")} value={courseForm.instructorNameEn} onChange={(e) => setCourseForm({ ...courseForm, instructorNameEn: e.target.value })} className="admin-input" />
            </div>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("المراجع والمصادر", "References & Sources")}</h3>
            <CourseReferencesPicker value={courseForm.libraryItemIds} onChange={(ids) => setCourseForm({ ...courseForm, libraryItemIds: ids })} />
          </div>
          <div className="sm:col-span-2">
            <DurationEditor
              hours={durationHours}
              minutes={durationMinutes}
              onChange={(h, m) => {
                setDurationHours(h);
                setDurationMinutes(m);
              }}
              t={t}
            />
          </div>
          <input placeholder={t("مسار الصورة", "Image path")} aria-label={t("مسار الصورة", "Image path")} value={courseForm.coverImageUrl} onChange={(e) => setCourseForm({ ...courseForm, coverImageUrl: e.target.value })} className="admin-input" />
          <SirajTooltip label={t("اختر صورة الغلاف للدورة", "Choose the course cover image")} side="top" className="w-full">
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("اختر صورة الغلاف للدورة", "Choose the course cover image")} onChange={(e) => setCourseImage(e.target.files?.[0] ?? null)} className="admin-input" />
          </SirajTooltip>
          <div className="sm:col-span-2">
            <button className="admin-button sm:w-auto sm:px-8">
              <ImagePlus size={16} />
              {t("حفظ الدورة", "Save course")}
            </button>
          </div>
        </form>
      </div>
      <SirajDialog {...dialog} />
    </div>
  );
}
