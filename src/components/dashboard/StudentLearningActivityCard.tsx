"use client";

import { Flame, Sparkles } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { DashboardLearningActivity } from "./types";

export default function StudentLearningActivityCard({
  activity,
}: {
  activity: DashboardLearningActivity;
}) {
  const { lang, t } = useLang();
  const numberFormat = new Intl.NumberFormat(lang === "ar" ? "ar" : "en");
  const peak = Math.max(...activity.days.map((day) => day.count), 1);
  const chartDescription = t(
    `أكملت ${activity.completedThisWeek} درساً خلال آخر 7 أيام.`,
    `You completed ${activity.completedThisWeek} lessons in the last 7 days.`,
  );
  const chartAccessibleLabel = `${chartDescription} ${activity.days
    .map((day) => {
      const weekday = lang === "ar" ? day.weekdayAr : day.weekdayEn;
      return `${weekday}: ${numberFormat.format(day.count)}`;
    })
    .join(lang === "ar" ? "، " : ", ")}`;

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-800/70 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Sparkles size={16} aria-hidden="true" />
            {t("رحلة التعلم", "Learning journey")}
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("نشاطك خلال الأسبوع", "Your weekly activity")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{chartDescription}</p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300">
          <Flame size={20} className="shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold tabular-nums leading-tight">
              {numberFormat.format(activity.currentStreak)} {t("أيام", "days")}
            </div>
            <div className="text-xs opacity-80">{t("سلسلة متتالية", "current streak")}</div>
          </div>
        </div>
      </div>

      <div
        role="img"
        aria-label={chartAccessibleLabel}
        className="mt-6 grid grid-cols-7 gap-2 sm:gap-3"
      >
        {activity.days.map((day) => {
          const weekday = lang === "ar" ? day.weekdayAr : day.weekdayEn;
          const height = day.count === 0 ? "0%" : `${Math.max(10, (day.count / peak) * 100)}%`;

          return (
            <div
              key={day.dateKey}
              title={`${weekday}: ${numberFormat.format(day.count)}`}
              aria-hidden="true"
              className="flex min-w-0 flex-col items-center gap-2"
            >
              <div className="flex h-20 w-full items-end justify-center rounded-xl bg-gray-100 p-1.5 dark:bg-gray-800 sm:h-24">
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-emerald-700 to-emerald-400 transition-[height] duration-500"
                  style={{ height }}
                />
              </div>
              <span className="truncate text-xs text-gray-500 dark:text-gray-400">{weekday}</span>
            </div>
          );
        })}
      </div>

      {activity.completedThisWeek === 0 && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          {t("أكمل درساً اليوم لتبدأ سجل نشاطك.", "Complete a lesson today to start your activity record.")}
        </p>
      )}
    </section>
  );
}
