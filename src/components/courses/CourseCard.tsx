"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { Clock, User } from "lucide-react";
import type { Course } from "@/lib/mock-data";

export default function CourseCard({ course }: { course: Course }) {
  const { t } = useLang();
  const progress = course.progress || 0;

  return (
    <Link href={`/courses/${course.id}`} className="group block">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-200/50 dark:bg-emerald-800/50 flex items-center justify-center">
              <span className="text-3xl font-bold text-emerald-700/50 dark:text-emerald-400/30" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                {course.title.charAt(0)}
              </span>
            </div>
          </div>
          {/* Level badge */}
          <div className="absolute top-3 end-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/90 dark:bg-gray-900/90 text-emerald-700 dark:text-emerald-400 backdrop-blur-sm">
              {t(course.level, course.levelEn)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {t(course.title, course.titleEn)}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <User size={13} />
              {t(course.instructor, course.instructorEn)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {course.duration}
            </span>
          </div>
          {progress > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>{t("التقدم", "Progress")}</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
