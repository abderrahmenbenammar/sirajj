"use client";

import Link from "next/link";
import { CheckCircle2, Play } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { DashboardCourse } from "./types";

export default function CourseProgressCard({ course }: { course: DashboardCourse }) {
  const { t, lang } = useLang();

  const title = t(course.titleAr, course.titleEn);
  const instructor =
    lang === "ar"
      ? course.instructorAr || course.instructorEn
      : course.instructorEn || course.instructorAr;
  const progressText = t(
    `تم إنجاز ${course.completedLessons} من ${course.totalLessons} دروس`,
    `${course.completedLessons} of ${course.totalLessons} lessons completed`,
  );

  return (
    <article className="group flex flex-col rounded-2xl border border-gray-200/60 bg-white p-5 transition-all hover:border-emerald-200 hover:shadow-md dark:border-gray-800/60 dark:bg-gray-900 dark:hover:border-emerald-900/60">
      <div className="flex items-start gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/60 dark:to-emerald-900/40">
          <span
            className="text-xl font-bold text-emerald-700/60 dark:text-emerald-400/50"
            style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
          >
            {course.titleAr.charAt(0)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
              {title}
            </h3>
            {course.isCompleted && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                {t("مكتملة", "Completed")}
              </span>
            )}
          </div>
          {instructor && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{instructor}</p>
          )}
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {course.progress}%
        </span>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        aria-valuenow={course.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={progressText}
        aria-label={title}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-500"
          style={{ width: `${course.progress}%` }}
        />
      </div>

      <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">{progressText}</p>

      <Link
        href={`/courses/${course.id}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        <Play size={15} />
        {t("متابعة التعلم", "Continue Learning")}
      </Link>
    </article>
  );
}
