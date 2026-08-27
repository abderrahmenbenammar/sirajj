"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookPlus, Film, ImagePlus, ListPlus, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/lang-context";

type Course = { id: string; slug: string; title: string; description: string | null; level: string; image: string | null; lessons: { id: string; title: string; position: number; videoUrl: string | null }[] };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { t } = useLang();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");
  const [courseForm, setCourseForm] = useState({ slug: "", title: "", description: "", level: "BEGINNER", image: "" });
  const [lessonForm, setLessonForm] = useState({ courseId: "", title: "", position: "1", videoUrl: "" });
  const [quizForm, setQuizForm] = useState({ lessonId: "", question: "", options: "", correctIndex: "0" });

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login?admin=1");
    if (session?.user?.role !== "ADMIN") router.replace("/");
  }, [status, session, router]);

  const loadCourses = async () => {
    const response = await fetch("/api/admin/courses");
    if (response.ok) setCourses(await response.json());
  };

  useEffect(() => { if (session?.user?.role === "ADMIN") loadCourses(); }, [session]);

  const submit = async (event: FormEvent, url: string, body: object, success: string) => {
    event.preventDefault();
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMessage(response.ok ? success : t("تعذر تنفيذ العملية", "Operation failed"));
    if (response.ok) { await loadCourses(); }
  };

  if (status === "loading" || session?.user?.role !== "ADMIN") return null;

  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="text-emerald-600" />
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("لوحة إدارة الأكاديمية", "Academy Administration")}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{t("إدارة المحتوى من الخادم بشكل آمن", "Secure server-side content management")}</p></div>
        </div>
        {message && <p className="mb-6 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{message}</p>}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <form onSubmit={(event) => submit(event, "/api/admin/courses", courseForm, t("تمت إضافة الدورة", "Course added"))} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><BookPlus size={18} />{t("إضافة دورة", "Add course")}</h2>
            <input required placeholder="slug" value={courseForm.slug} onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })} className="admin-input" />
            <input required placeholder={t("العنوان", "Title")} value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} className="admin-input" />
            <input placeholder={t("الوصف", "Description")} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} className="admin-input" />
            <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })} className="admin-input"><option value="BEGINNER">مبتدئ</option><option value="INTERMEDIATE">متوسط</option><option value="ADVANCED">متقدم</option></select>
            <input placeholder={t("مسار الصورة", "Image path")} value={courseForm.image} onChange={(e) => setCourseForm({ ...courseForm, image: e.target.value })} className="admin-input" />
            <button className="admin-button"><ImagePlus size={16} />{t("حفظ الدورة", "Save course")}</button>
          </form>

          <form onSubmit={(event) => submit(event, "/api/admin/lessons", { ...lessonForm, position: Number(lessonForm.position) }, t("تمت إضافة الدرس", "Lesson added"))} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Film size={18} />{t("إضافة درس وفيديو", "Add lesson and video")}</h2>
            <select required value={lessonForm.courseId} onChange={(e) => setLessonForm({ ...lessonForm, courseId: e.target.value })} className="admin-input"><option value="">{t("اختر الدورة", "Select course")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
            <input required placeholder={t("عنوان الدرس", "Lesson title")} value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className="admin-input" />
            <input required type="number" min="1" placeholder="position" value={lessonForm.position} onChange={(e) => setLessonForm({ ...lessonForm, position: e.target.value })} className="admin-input" />
            <input placeholder="YouTube أو /videos/file.mp4" value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} className="admin-input" />
            <button className="admin-button"><ListPlus size={16} />{t("حفظ الدرس", "Save lesson")}</button>
          </form>

          <form onSubmit={(event) => submit(event, "/api/admin/quizzes", { ...quizForm, options: quizForm.options.split("|").map((option) => option.trim()), correctIndex: Number(quizForm.correctIndex) }, t("تمت إضافة السؤال", "Question added"))} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><ListPlus size={18} />{t("إضافة اختبار", "Add quiz question")}</h2>
            <select required value={quizForm.lessonId} onChange={(e) => setQuizForm({ ...quizForm, lessonId: e.target.value })} className="admin-input"><option value="">{t("اختر الدرس", "Select lesson")}</option>{courses.flatMap((course) => course.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{course.title}: {lesson.title}</option>))}</select>
            <input required placeholder={t("السؤال", "Question")} value={quizForm.question} onChange={(e) => setQuizForm({ ...quizForm, question: e.target.value })} className="admin-input" />
            <input required placeholder={t("الخيارات مفصولة بعلامة |", "Options separated by |")} value={quizForm.options} onChange={(e) => setQuizForm({ ...quizForm, options: e.target.value })} className="admin-input" />
            <input required type="number" min="0" placeholder="correct index" value={quizForm.correctIndex} onChange={(e) => setQuizForm({ ...quizForm, correctIndex: e.target.value })} className="admin-input" />
            <button className="admin-button"><ListPlus size={16} />{t("حفظ السؤال", "Save question")}</button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("الدورات الحالية", "Current courses")}</h2>
          <div className="space-y-2">{courses.map((course) => <div key={course.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="text-sm text-gray-900 dark:text-white">{course.title}</span><span className="text-xs text-gray-500 dark:text-gray-400">{course.level} · {course.lessons.length} {t("دروس", "lessons")}</span></div>)}</div>
        </div>
      </div>
    </div>
  );
}
