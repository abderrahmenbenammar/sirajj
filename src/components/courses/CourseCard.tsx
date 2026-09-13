"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { Clock, User } from "lucide-react";
import type { ApiCourse } from "@/lib/courses-api";

export default function CourseCard({ course, locked = false }: { course: ApiCourse; locked?: boolean }) {
  const { t } = useLang();
  const progress = 0;

  const hasImage = Boolean(course.image);
  const card = (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 overflow-hidden">
          {hasImage ? (
            <img
              src={course.image}
              alt={t(course.title, course.titleEn)}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-emerald-700/20 dark:text-emerald-400/20" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>{t(course.title, course.titleEn).charAt(0)}</span>
            </div>
          )}
          {/* Level badge */}
          <div className="absolute top-3 end-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/90 dark:bg-gray-900/90 text-emerald-700 dark:text-emerald-400 backdrop-blur-sm">
              {t(course.level, course.levelEn)}
            </span>
          </div>
          {locked && (
            <div className="absolute inset-0 bg-gray-900/35 flex items-center justify-center">
              <span className="px-3 py-1.5 rounded-lg bg-white/95 text-xs font-semibold text-gray-700">
                {t("مقفل حتى إتمام المستوى السابق", "Locked until the previous level is completed")}
              </span>
            </div>
          )}
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
  );

  return locked ? (
    <div className="group block cursor-not-allowed" aria-disabled="true">
      {card}
    </div>
  ) : (
    <Link href={`/courses/${course.id}`} className="group block">
      {card}
    </Link>
  );
}
