"use client";

import { Award, BookOpen, Trophy } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { DashboardStats } from "./types";

interface StatItem {
  key: keyof DashboardStats;
  icon: typeof BookOpen;
  labelAr: string;
  labelEn: string;
}

const STAT_ITEMS: StatItem[] = [
  { key: "totalEnrolled", icon: BookOpen, labelAr: "الدورات المسجلة", labelEn: "Enrolled Courses" },
  { key: "totalCompletedCourses", icon: Trophy, labelAr: "الدورات المكتملة", labelEn: "Completed Courses" },
  { key: "certificatesCount", icon: Award, labelAr: "الشهادات المحصلة", labelEn: "Certificates Earned" },
];

export default function StudentStatsGrid({ stats }: { stats: DashboardStats }) {
  const { t } = useLang();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-800/60 dark:bg-gray-900"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 -start-10 h-28 w-28 rounded-full bg-emerald-500/10 transition-transform duration-500 group-hover:scale-125"
            />
            <div className="relative flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm shadow-emerald-600/30">
                <Icon size={22} />
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500/60" aria-hidden="true" />
            </div>
            <div className="relative mt-4 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {stats[item.key]}
            </div>
            <div className="relative mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t(item.labelAr, item.labelEn)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
