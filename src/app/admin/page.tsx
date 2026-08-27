"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookPlus, Film, ImagePlus, ListPlus, ShieldCheck, Trash2, Users, X, LibraryBig } from "lucide-react";
import { useLang } from "@/lib/lang-context";

type Course = { id: string; slug: string; title: string; description: string | null; level: string; image: string | null; lessons: { id: string; title: string; position: number; videoUrl: string | null }[] };
type Subscriber = { id: string; name: string; email: string; role: string; emailVerified: string | null; createdAt: string; _count: { enrollments: number; progress: number } };
type SubscriberDetails = Subscriber & { enrollments: { createdAt: string; course: { id: string; title: string; level: string } }[]; progress: { completed: boolean; completedAt: string | null; lesson: { title: string; position: number; course: { title: string } } }[] };
type LibraryItem = { id: string; type: string; title: string; author: string | null; category: string | null; mediaUrl: string | null };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { t } = useLang();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [message, setMessage] = useState("");
  const [courseForm, setCourseForm] = useState({ slug: "", title: "", description: "", level: "BEGINNER", image: "" });
  const [lessonForm, setLessonForm] = useState({ courseId: "", title: "", position: "1", videoUrl: "" });
  const [quizForm, setQuizForm] = useState({ lessonId: "", question: "", options: "", correctIndex: "0" });
  const [libraryForm, setLibraryForm] = useState({ type: "BOOK", title: "", author: "", category: "", description: "", content: "", mediaUrl: "" });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [lessonVideo, setLessonVideo] = useState<File | null>(null);
  const [libraryFile, setLibraryFile] = useState<File | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login?admin=1");
    if (session?.user?.role !== "ADMIN") router.replace("/");
  }, [status, session, router]);

  const loadCourses = async () => {
    const response = await fetch("/api/admin/courses");
    if (response.ok) setCourses(await response.json());
  };

  const loadSubscribers = async () => {
    const response = await fetch("/api/admin/users");
    if (response.ok) setSubscribers(await response.json());
  };

  const loadLibrary = async () => {
    const response = await fetch("/api/admin/library");
    if (response.ok) setLibraryItems(await response.json());
  };

  useEffect(() => { if (session?.user?.role === "ADMIN") { loadCourses(); loadSubscribers(); loadLibrary(); } }, [session]);

  const deleteCourse = async (course: Course) => {
    if (!window.confirm(`${t("هل تريد حذف دورة", "Delete course")} "${course.title}"؟`)) return;
    const response = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
    setMessage(response.ok ? t("تم حذف الدورة", "Course deleted") : t("تعذر حذف الدورة", "Could not delete course"));
    if (response.ok) await loadCourses();
  };

  const showSubscriberDetails = async (subscriberId: string) => {
    setDetailsLoading(true);
    const response = await fetch(`/api/admin/users/${subscriberId}`);
    if (response.ok) setSelectedSubscriber(await response.json());
    setDetailsLoading(false);
  };

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
    try {
      const image = courseImage ? await uploadFile(courseImage, "image") : courseForm.image;
      await submit(event, "/api/admin/courses", { ...courseForm, image }, t("تمت إضافة الدورة", "Course added"));
      setCourseImage(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : t("تعذر رفع الصورة", "Could not upload image")); }
  };

  const submitLesson = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const videoUrl = lessonVideo ? await uploadFile(lessonVideo, "video") : lessonForm.videoUrl;
      await submit(event, "/api/admin/lessons", { ...lessonForm, videoUrl, position: Number(lessonForm.position) }, t("تمت إضافة الدرس", "Lesson added"));
      setLessonVideo(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : t("تعذر رفع الفيديو", "Could not upload video")); }
  };

  const submitLibrary = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const fileKind = libraryFile?.type.startsWith("image/") ? "image" : libraryFile?.type.startsWith("video/") ? "video" : "document";
      const mediaUrl = libraryFile ? await uploadFile(libraryFile, fileKind) : libraryForm.mediaUrl;
      await submit(event, "/api/admin/library", { ...libraryForm, mediaUrl }, t("تمت إضافة عنصر المكتبة", "Library item added"));
      setLibraryFile(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : t("تعذر رفع الملف", "Could not upload file")); }
  };

  const submit = async (event: FormEvent, url: string, body: object, success: string) => {
    event.preventDefault();
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMessage(response.ok ? success : t("تعذر تنفيذ العملية", "Operation failed"));
    if (response.ok) { await loadCourses(); await loadLibrary(); }
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
          <form onSubmit={submitCourse} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><BookPlus size={18} />{t("إضافة دورة", "Add course")}</h2>
            <input required placeholder="slug" value={courseForm.slug} onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })} className="admin-input" />
            <input required placeholder={t("العنوان", "Title")} value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} className="admin-input" />
            <input placeholder={t("الوصف", "Description")} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} className="admin-input" />
            <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })} className="admin-input"><option value="BEGINNER">مبتدئ</option><option value="INTERMEDIATE">متوسط</option><option value="ADVANCED">متقدم</option></select>
            <input placeholder={t("مسار الصورة", "Image path")} value={courseForm.image} onChange={(e) => setCourseForm({ ...courseForm, image: e.target.value })} className="admin-input" />
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCourseImage(e.target.files?.[0] ?? null)} className="admin-input" />
            <button className="admin-button"><ImagePlus size={16} />{t("حفظ الدورة", "Save course")}</button>
          </form>

          <form onSubmit={submitLesson} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Film size={18} />{t("إضافة درس وفيديو", "Add lesson and video")}</h2>
            <select required value={lessonForm.courseId} onChange={(e) => setLessonForm({ ...lessonForm, courseId: e.target.value })} className="admin-input"><option value="">{t("اختر الدورة", "Select course")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
            <input required placeholder={t("عنوان الدرس", "Lesson title")} value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className="admin-input" />
            <input required type="number" min="1" placeholder="position" value={lessonForm.position} onChange={(e) => setLessonForm({ ...lessonForm, position: e.target.value })} className="admin-input" />
            <input placeholder="YouTube أو /videos/file.mp4" value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} className="admin-input" />
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setLessonVideo(e.target.files?.[0] ?? null)} className="admin-input" />
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

          <form onSubmit={submitLibrary} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><LibraryBig size={18} />{t("إضافة عنصر للمكتبة", "Add library item")}</h2>
            <select value={libraryForm.type} onChange={(e) => setLibraryForm({ ...libraryForm, type: e.target.value })} className="admin-input"><option value="BOOK">كتاب</option><option value="ARTICLE">مقال</option><option value="RESEARCH">بحث</option><option value="LECTURE">محاضرة</option></select>
            <input required placeholder={t("العنوان", "Title")} value={libraryForm.title} onChange={(e) => setLibraryForm({ ...libraryForm, title: e.target.value })} className="admin-input" />
            <input placeholder={t("المؤلف أو المحاضر", "Author or speaker")} value={libraryForm.author} onChange={(e) => setLibraryForm({ ...libraryForm, author: e.target.value })} className="admin-input" />
            <input placeholder={t("التصنيف", "Category")} value={libraryForm.category} onChange={(e) => setLibraryForm({ ...libraryForm, category: e.target.value })} className="admin-input" />
            <input placeholder={t("رابط الغلاف أو الملف", "Cover or media URL")} value={libraryForm.mediaUrl} onChange={(e) => setLibraryForm({ ...libraryForm, mediaUrl: e.target.value })} className="admin-input" />
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,text/plain" onChange={(e) => setLibraryFile(e.target.files?.[0] ?? null)} className="admin-input" />
            <textarea placeholder={t("الوصف أو المحتوى", "Description or content")} value={libraryForm.content} onChange={(e) => setLibraryForm({ ...libraryForm, content: e.target.value })} className="admin-input min-h-24" />
            <button className="admin-button"><LibraryBig size={16} />{t("حفظ عنصر المكتبة", "Save library item")}</button>
          </form>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("عناصر المكتبة المضافة", "Added library items")}</h2>
          {libraryItems.length > 0 ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{libraryItems.map((item) => <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.type} {item.author ? `· ${item.author}` : ""}</p></div>)}</div> : <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد عناصر مضافة بعد.", "No library items added yet.")}</p>}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("الدورات الحالية", "Current courses")}</h2>
          <div className="space-y-2">{courses.map((course) => <div key={course.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><div className="min-w-0"><span className="block text-sm text-gray-900 dark:text-white truncate">{course.title}</span><span className="text-xs text-gray-500 dark:text-gray-400">{course.level} · {course.lessons.length} {t("دروس", "lessons")}</span></div><button type="button" onClick={() => deleteCourse(course)} className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`${t("حذف", "Delete")} ${course.title}`}><Trash2 size={16} /></button></div>)}</div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Users size={18} />{t("ملفات المشتركين", "Subscriber files")}</h2>
          {subscribers.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-start text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800"><th className="p-3 text-start">{t("الاسم", "Name")}</th><th className="p-3 text-start">{t("البريد", "Email")}</th><th className="p-3 text-start">{t("التسجيل", "Joined")}</th><th className="p-3 text-start">{t("الدورات", "Courses")}</th><th className="p-3 text-start">{t("الحالة", "Status")}</th></tr></thead><tbody>{subscribers.map((subscriber) => <tr key={subscriber.id} className="border-b border-gray-100 dark:border-gray-800/70 text-gray-700 dark:text-gray-300"><td className="p-3"><button type="button" disabled={detailsLoading} onClick={() => showSubscriberDetails(subscriber.id)} className="inline-flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50" aria-label={`${t("عرض ملف", "View profile")} ${subscriber.name}`}><Users size={15} />{subscriber.name}</button></td><td className="p-3">{subscriber.email}</td><td className="p-3">{new Date(subscriber.createdAt).toLocaleDateString("ar")}</td><td className="p-3">{subscriber._count.enrollments}</td><td className="p-3">{subscriber.emailVerified ? t("موثق", "Verified") : t("غير موثق", "Unverified")}</td></tr>)}</tbody></table></div>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا يوجد مشتركون بعد.", "No subscribers yet.")}</p>}
        </div>

        {selectedSubscriber && (
          <div className="mt-6 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div><h2 className="font-bold text-lg text-gray-900 dark:text-white">{t("ملف المشترك", "Subscriber profile")}</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedSubscriber.name} · {selectedSubscriber.email}</p></div>
              <button type="button" onClick={() => setSelectedSubscriber(null)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("إغلاق الملف", "Close profile")}><X size={18} /></button>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mb-6 text-sm"><div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="block text-xs text-gray-500 mb-1">{t("تاريخ التسجيل", "Joined")}</span>{new Date(selectedSubscriber.createdAt).toLocaleDateString("ar")}</div><div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="block text-xs text-gray-500 mb-1">{t("حالة البريد", "Email status")}</span>{selectedSubscriber.emailVerified ? t("موثق", "Verified") : t("غير موثق", "Unverified")}</div><div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="block text-xs text-gray-500 mb-1">{t("الدروس المكتملة", "Completed lessons")}</span>{selectedSubscriber.progress.filter((item) => item.completed).length}</div></div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t("الدورات المسجل بها", "Enrolled courses")}</h3>
            {selectedSubscriber.enrollments.length > 0 ? <div className="space-y-2 mb-6">{selectedSubscriber.enrollments.map((enrollment) => <div key={enrollment.course.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm"><span className="text-gray-900 dark:text-white">{enrollment.course.title}</span><span className="text-xs text-gray-500 dark:text-gray-400">{enrollment.course.level}</span></div>)}</div> : <p className="text-sm text-gray-500 mb-6">{t("لم يسجل في دورات بعد.", "No course enrollments yet.")}</p>}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t("تقدم الدروس", "Lesson progress")}</h3>
            {selectedSubscriber.progress.length > 0 ? <div className="space-y-2">{selectedSubscriber.progress.map((item) => <div key={`${item.lesson.course.title}-${item.lesson.position}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm"><span className="text-gray-700 dark:text-gray-300">{item.lesson.course.title}: {item.lesson.title}</span><span className={item.completed ? "text-emerald-600" : "text-gray-500"}>{item.completed ? t("مكتمل", "Completed") : t("قيد التقدم", "In progress")}</span></div>)}</div> : <p className="text-sm text-gray-500">{t("لا يوجد تقدم مسجل بعد.", "No progress recorded yet.")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
