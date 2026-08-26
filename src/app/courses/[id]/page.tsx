"use client";

import { use } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { courses, isCourseUnlocked } from "@/lib/mock-data";
import { ArrowLeft, ArrowRight, Clock, Users, BookOpen, CheckCircle, PlayCircle, FileText, HelpCircle } from "lucide-react";

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLang();
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t("الدورة غير موجودة", "Course not found")}
        </h1>
        <Link href="/courses" className="text-emerald-700 dark:text-emerald-400 hover:underline">
          {t("العودة للدورات", "Back to courses")}
        </Link>
      </div>
    );
  }

  if (!isCourseUnlocked(course)) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t("هذه الدورة مقفلة", "This course is locked")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t("أتمم دورة من المستوى السابق للانتقال إلى هذا المسار.", "Complete a course from the previous level to continue on this path.")}
        </p>
        <Link href="/courses" className="text-emerald-700 dark:text-emerald-400 hover:underline">
          {t("العودة للدورات", "Back to courses")}
        </Link>
      </div>
    );
  }

  const progress = course.progress || 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <PlayCircle size={16} className="text-emerald-500" />;
      case "reading": return <FileText size={16} className="text-blue-500" />;
      case "quiz": return <HelpCircle size={16} className="text-amber-500" />;
      default: return <PlayCircle size={16} />;
    }
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/courses" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            {t("الدورات", "Courses")}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t(course.title, course.titleEn)}</span>
        </div>

        <div className="relative aspect-[16/5] min-h-48 overflow-hidden rounded-2xl mb-8 border border-gray-200/60 dark:border-gray-800/60">
          <img
            src={course.image}
            alt={t(course.title, course.titleEn)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <h1 className="absolute bottom-6 start-6 end-6 text-2xl sm:text-3xl font-bold text-white drop-shadow-md">
            {t(course.title, course.titleEn)}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-2xl p-8 sm:p-10 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 dark:bg-gray-900/80 text-emerald-700 dark:text-emerald-400 inline-block mb-4">
                {t(course.category, course.categoryEn)}
              </span>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {t(course.description, course.descriptionEn)}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><Users size={15} /> {t(course.instructor, course.instructorEn)}</span>
                <span className="flex items-center gap-1.5"><Clock size={15} /> {course.duration}</span>
                <span className="flex items-center gap-1.5"><BookOpen size={15} /> {course.lessons} {t("درس", "lessons")}</span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  {t(course.level, course.levelEn)}
                </span>
              </div>
            </div>

            {/* Objectives */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t("أهداف الدورة", "Course Objectives")}
              </h2>
              <ul className="space-y-3">
                {(lang === "ar" ? course.objectives : course.objectivesEn).map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                    <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Curriculum */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t("منهاج الدورة", "Course Curriculum")}
              </h2>
              <div className="space-y-2">
                {course.curriculum.map((item, i) => (
                  <Link
                    key={item.id}
                    href={`/courses/${course.id}/lessons/${item.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <span className="text-sm font-medium text-gray-400 w-6 text-center">{i + 1}</span>
                    {getTypeIcon(item.type)}
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {t(item.title, item.titleEn)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{item.duration}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* References */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t("المراجع والمصادر", "References & Sources")}
              </h2>
              <ul className="space-y-2">
                {course.references.map((ref, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-600 dark:text-gray-400 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    {ref}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sticky top-24">
              {progress > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>{t("التقدم", "Progress")}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <Link
                href={`/courses/${course.id}/lessons/${course.curriculum[0]?.id || "c1"}`}
                className="block w-full text-center py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 mb-3"
              >
                {progress > 0 ? t("متابعة التعلم", "Continue Learning") : t("ابدأ الدورة", "Start Course")}
              </Link>

              <div className="space-y-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("المستوى", "Level")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{t(course.level, course.levelEn)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("المدة", "Duration")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{course.duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("عدد الدروس", "Lessons")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{course.lessons}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("المعلم", "Instructor")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{t(course.instructor, course.instructorEn)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
