"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Route } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { courses, isCourseUnlocked } from "@/lib/mock-data";

const pathLevels = [
  {
    level: "مبتدئ",
    levelEn: "Beginner",
    description: "ابدأ ببناء أساس متين في العلوم الشرعية.",
    descriptionEn: "Build a strong foundation in Islamic sciences.",
    color: "emerald",
  },
  {
    level: "متوسط",
    levelEn: "Intermediate",
    description: "وسّع معرفتك وانتقل إلى دراسة أكثر عمقًا.",
    descriptionEn: "Expand your knowledge with deeper study.",
    color: "blue",
  },
  {
    level: "متقدم",
    levelEn: "Advanced",
    description: "تخصص وتعمق في المسائل العلمية المتقدمة.",
    descriptionEn: "Specialize and explore advanced subjects.",
    color: "amber",
  },
];

export default function PathsPage() {
  const { t, lang } = useLang();

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
            {t("اتبع المستويات بالترتيب: مبتدئ ثم متوسط ثم متقدم.", "Follow the levels in order: Beginner, Intermediate, then Advanced.")}
          </p>
        </div>

        <div className="space-y-6">
          {pathLevels.map((path, index) => {
            const pathCourses = courses.filter((course) => course.level === path.level);
            const unlocked = pathCourses.some(isCourseUnlocked);
            const colorClasses = {
              emerald: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400",
              blue: "border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400",
              amber: "border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
            }[path.color];

            return (
              <section key={path.level} className={`rounded-2xl border p-6 sm:p-8 ${colorClasses}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/80 dark:bg-gray-900/60 flex items-center justify-center shrink-0">
                      {unlocked ? <CheckCircle2 size={22} /> : <LockKeyhole size={21} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{t(`المستوى ${index + 1}`, `Level ${index + 1}`)}</p>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t(path.level, path.levelEn)}</h2>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t(path.description, path.descriptionEn)}</p>
                    </div>
                  </div>
                  {!unlocked && (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("يتطلب إتمام المستوى السابق", "Requires completing the previous level")}
                    </span>
                  )}
                </div>

                {pathCourses.length > 0 ? (
                  <div className="grid gap-3">
                    {pathCourses.map((course) => {
                      const courseUnlocked = isCourseUnlocked(course);
                      const content = (
                        <div className={`flex items-center gap-4 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-white/70 dark:border-gray-800/60 p-4 ${courseUnlocked ? "hover:bg-white dark:hover:bg-gray-900" : "opacity-70"} transition-colors`}>
                          <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                            {course.title.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{t(course.title, course.titleEn)}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(course.instructor, course.instructorEn)} · {course.lessons} {t("درس", "lessons")}</p>
                          </div>
                          {courseUnlocked ? (lang === "ar" ? <ArrowLeft size={18} /> : <ArrowRight size={18} />) : <LockKeyhole size={17} className="text-gray-400" />}
                        </div>
                      );

                      return courseUnlocked ? <Link key={course.id} href={`/courses/${course.id}`}>{content}</Link> : <div key={course.id}>{content}</div>;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("لا توجد دورات في هذا المستوى حاليًا.", "No courses are available at this level yet.")}</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
