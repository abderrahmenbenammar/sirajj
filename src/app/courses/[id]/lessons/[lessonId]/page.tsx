"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { fetchCourse, type ApiCourse } from "@/lib/courses-api";
import { ArrowLeft, ArrowRight, Play, ChevronLeft, ChevronRight, BookOpen, HelpCircle, FileText, CheckCircle } from "lucide-react";

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = use(params);
  const { t, lang } = useLang();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completeError, setCompleteError] = useState("");
  const [loadingCourse, setLoadingCourse] = useState(true);
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    setLoadingCourse(true);
    fetchCourse(id).then((data) => {
      setCourse(data);
      setCompleted(data?.completedLessonIds?.includes(lessonId) ?? false);
      setLoadingCourse(false);
    });
  }, [id, lessonId]);

  const markComplete = async () => {
    setSaving(true);
    setCompleteError("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
      if (!response.ok) {
        setCompleteError(t("تعذر تسجيل الإكمال، حاول مجددًا", "Could not record completion, try again"));
        return;
      }
      const data: { progress?: number } = await response.json();
      setCompleted(true);
      setCourse((prev) => (prev ? { ...prev, progress: typeof data.progress === "number" ? data.progress : (prev.progress ?? 0) } : prev));
    } catch {
      setCompleteError(t("تعذر تسجيل الإكمال، حاول مجددًا", "Could not record completion, try again"));
    } finally {
      setSaving(false);
    }
  };
  const lessonIndex = course?.curriculum.findIndex((l) => l.id === lessonId) ?? -1;
  const lesson = lessonIndex >= 0 ? course?.curriculum[lessonIndex] : null;

  if (loadingCourse) {
    return (
      <div className="py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!course || !lesson) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t("الدرس غير موجود", "Lesson not found")}
        </h1>
        <Link href={`/courses/${id}`} className="text-emerald-700 dark:text-emerald-400 hover:underline">
          {t("العودة للدورة", "Back to course")}
        </Link>
      </div>
    );
  }

  const prevLesson = lessonIndex > 0 ? course.curriculum[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < course.curriculum.length - 1 ? course.curriculum[lessonIndex + 1] : null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Play size={14} />;
      case "reading": return <BookOpen size={14} />;
      case "quiz": return <HelpCircle size={14} />;
      default: return <Play size={14} />;
    }
  };

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/courses" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("الدورات", "Courses")}</Link>
          <span>/</span>
          <Link href={`/courses/${id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">{t(course.title, course.titleEn)}</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t(lesson.title, lesson.titleEn)}</span>
        </div>

        {/* Video Player */}
        {(() => {
          const getEmbedUrl = (url: string): string | null => {
            if (!url) return null;
            if (url.endsWith(".mp4")) return null;
            try {
              const u = new URL(url);
              // youtu.be/ID
              if (u.hostname === "youtu.be" || u.hostname === "www.youtu.be") {
                const id = u.pathname.split("/").filter(Boolean)[0];
                if (id) return `https://www.youtube.com/embed/${id}`;
              }
              // youtube.com
              if (u.hostname.includes("youtube.com")) {
                if (u.pathname.startsWith("/embed/")) return url;
                const v = u.searchParams.get("v");
                if (v) return `https://www.youtube.com/embed/${v}`;
                // /shorts/ID or /v/ID
                const parts = u.pathname.split("/").filter(Boolean);
                if (parts.length >= 2 && (parts[0] === "shorts" || parts[0] === "v")) {
                  return `https://www.youtube.com/embed/${parts[1]}`;
                }
              }
              return url;
            } catch {
              return url;
            }
          };
          const embedUrl = lesson.videoUrl ? getEmbedUrl(lesson.videoUrl) : null;
          const isMp4 = lesson.videoUrl?.endsWith(".mp4");
          // Derive watch URL for "Open on YouTube" link
          const getWatchUrl = (url: string): string => {
            if (!url) return url;
            try {
              const u = new URL(url);
              if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) {
                const id = u.pathname.split("/")[2];
                return `https://www.youtube.com/watch?v=${id}`;
              }
              if (u.hostname === "youtu.be" || u.hostname === "www.youtu.be") {
                const id = u.pathname.split("/").filter(Boolean)[0];
                return `https://www.youtube.com/watch?v=${id}`;
              }
              return url;
            } catch { return url; }
          };
          return (
            <>
              <div className="aspect-video bg-gray-900 dark:bg-gray-950 rounded-2xl overflow-hidden mb-8 border border-gray-800">
                {isMp4 ? (
                  <video
                    src={lesson.videoUrl}
                    title={t(lesson.title, lesson.titleEn)}
                    className="w-full h-full"
                    controls
                    preload="metadata"
                  />
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={t(lesson.title, lesson.titleEn)}
                    className="w-full h-full"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="h-full flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-emerald-950/10" />
                    <div className="relative z-10 flex flex-col items-center gap-4 p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <Play size={32} className="text-white ms-1" />
                      </div>
                      <span className="text-sm text-gray-400">
                        {t(lesson.title, lesson.titleEn)}
                      </span>
                      <span className="text-xs text-gray-500">{t("لا يوجد فيديو لهذا الدرس بعد", "No video available for this lesson yet")}</span>
                    </div>
                  </div>
                )}
              </div>
              {embedUrl && (
                <p className="-mt-4 mb-8 text-sm text-gray-500 dark:text-gray-400">
                  {t("إذا لم يعمل التشغيل داخل الصفحة، افتح الفيديو مباشرة على YouTube.", "If playback does not work here, open the video directly on YouTube.")} {" "}
                  <a
                    href={getWatchUrl(lesson.videoUrl!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {t("فتح الفيديو", "Open video")}
                  </a>
                </p>
              )}
            </>
          );
        })()}

        {/* Lesson Info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              {getTypeIcon(lesson.type)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t(lesson.title, lesson.titleEn)}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {lesson.duration} · {course.instructor && t(course.instructor, course.instructorEn)}
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            {lesson.type === "video" && (
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t("محتوى الدرس", "Lesson Content")}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(
                    "في هذا الدرس سنتناول المفاهيم الأساسية والمعرفة الهامة حول هذا الموضوع. يرجى مشاهدة الفيديو التعليمي والتمكن من المحتوى قبل الانتقال إلى الدرس التالي.",
                    "In this lesson we cover the fundamental concepts and important knowledge about this topic. Please watch the educational video and master the content before moving to the next lesson."
                  )}
                </p>
              </div>
            )}
            {lesson.type === "reading" && (
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t("القراءة المطلوبة", "Required Reading")}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(
                    "يرجى قراءة النص المرفق بعناية والتمعن في مضامينه. يحتوي هذا الدرس على مواد قرائية مهمة تعمق فهمك للموضوع.",
                    "Please read the attached text carefully and reflect on its contents. This lesson contains important reading materials that deepen your understanding of the topic."
                  )}
                </p>
                <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <FileText size={24} className="text-emerald-500 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("انقر هنا لقراءة النص الكامل", "Click here to read the full text")}
                  </p>
                </div>
              </div>
            )}
            {lesson.type === "quiz" && (
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t("اختبار الوحدة", "Unit Assessment")}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  {t(
                    "اختبر معلوماتك في هذا الاختبار القصير. يحتوي على أسئلة متعددة الخيارات لتقييم فهمك للمادة الدراسية.",
                    "Test your knowledge with this short quiz. It contains multiple choice questions to assess your understanding of the study material."
                  )}
                </p>
                <Link href="/exams" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors">
                  <HelpCircle size={18} />
                  {t("ابدأ الاختبار", "Start Quiz")}
                </Link>
              </div>
            )}
          </div>

          {/* Completion */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col items-start gap-3">
            {isAuthenticated ? (
              completed ? (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                  <CheckCircle size={16} />
                  {t("مكتمل", "Completed")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={markComplete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium rounded-xl border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {saving ? t("جارٍ الحفظ...", "Saving...") : t("تحديد كمكتمل", "Mark as Complete")}
                </button>
              )
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl transition-colors"
              >
                {t("سجل الدخول لتسجيل إتمام الدرس", "Sign in to track lesson completion")}
              </Link>
            )}
            {completeError && <p className="text-sm text-red-600 dark:text-red-400">{completeError}</p>}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          {prevLesson ? (
            <Link
              href={`/courses/${id}/lessons/${prevLesson.id}`}
              className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            >
              {lang === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {t(prevLesson.title, prevLesson.titleEn)}
            </Link>
          ) : <div />}
          {nextLesson ? (
            <Link
              href={`/courses/${id}/lessons/${nextLesson.id}`}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              {t(nextLesson.title, nextLesson.titleEn)}
              {lang === "ar" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </Link>
          ) : (
            <Link
              href={`/courses/${id}`}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {t("العودة للدورة", "Back to Course")}
              {lang === "ar" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </Link>
          )}
        </div>

        {/* Sidebar Lessons */}
        <div className="mt-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t("فهرس الدروس", "Lesson Index")}</h3>
          <div className="space-y-1">
            {course.curriculum.map((item, i) => (
              <Link
                key={item.id}
                href={`/courses/${id}/lessons/${item.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                  item.id === lessonId
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400"
                }`}
              >
                <span className="w-6 text-center text-xs font-medium">{i + 1}</span>
                {getTypeIcon(item.type)}
                <span className="flex-1">{t(item.title, item.titleEn)}</span>
                <span className="text-xs text-gray-400">{item.duration}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
