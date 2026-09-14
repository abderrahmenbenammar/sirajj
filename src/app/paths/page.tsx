"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Route } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useEffect, useState } from "react";
import { fetchCourses, type ApiCourse } from "@/lib/courses-api";
import { COURSE_PATHS, COURSE_PATH_LABELS } from "@/lib/course-paths";

const pathColors = ["emerald", "blue", "amber"] as const;

export default function PathsPage() {
  const { t, lang } = useLang();
  const [courses, setCourses] = useState<ApiCourse[]>([]);

  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  // The three paths are fixed (BEGINNER / INTERMEDIATE / ADVANCED); every
  // course below was loaded from the DB and grouped by its real `path`.
  const groups = COURSE_PATHS.map((key) => ({
    key,
    label: COURSE_PATH_LABELS[key],
    courses: courses.filter((course) => course.path === key),
  }));

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-3">
            <Route size={20} />
            <span className="text-sm font-semibold">{t("رحلة التعلم", "Learning Journey")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t("المسارات التعليمية", "Learning Paths")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t("ثلاثة مستويات ثابتة: مبتدئ، متوسط، متقدم — اختَر مسارك وتابع دوراته.", "Three fixed levels: Beginner, Intermediate, Advanced — pick a path and follow its courses.")}
          </p>
        </div>

        <div className="space-y-6">
          {groups.map((group, index) => {
            const color = pathColors[index % pathColors.length];
            const colorClasses = {
              emerald: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400",
              blue: "border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400",
              amber: "border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
            }[color];

            return (
              <section key={group.key} className={`rounded-2xl border p-6 sm:p-8 ${colorClasses}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/80 dark:bg-gray-900/60 flex items-center justify-center shrink-0">
                      <BookOpen size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{t(`المسار ${index + 1}`, `Path ${index + 1}`)}</p>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t(group.label.ar, group.label.en)}</h2>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{group.courses.length} {t("دورات", "courses")}</p>
                    </div>
                  </div>
                  <Link
                    href={`/courses?path=${group.key}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-gray-900/60 border border-white/70 dark:border-gray-800/60 rounded-xl px-4 py-2 hover:bg-white dark:hover:bg-gray-900 transition-colors shrink-0"
                  >
                    {t("تصفح الدورات", "Browse courses")}
                    {lang === "ar" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                  </Link>
                </div>

                <div className="grid gap-3">
                  {group.courses.length > 0 ? (
                    group.courses.map((course) => {
                      const content = (
                        <div className="flex items-center gap-4 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-white/70 dark:border-gray-800/60 p-4 hover:bg-white dark:hover:bg-gray-900 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                            {course.title.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{t(course.title, course.titleEn)}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(course.instructor, course.instructorEn)} · {course.lessons} {t("درس", "lessons")}</p>
                          </div>
                          {lang === "ar" ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                        </div>
                      );

                      return <Link key={course.id} href={`/courses/${course.id}`}>{content}</Link>;
                    })
                  ) : (
                    <p className="text-sm opacity-70">{t("لا توجد دورات في هذا المسار بعد.", "No courses in this path yet.")}</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}