"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLang } from "@/lib/lang-context";
import { COURSE_PATHS, COURSE_PATH_LABELS } from "@/lib/course-paths";
import PageHeader from "@/components/admin/PageHeader";
import { CardSkeleton } from "@/components/admin/AdminSkeleton";

type SettingsCourse = { id: string; path: string };

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const { t } = useLang();
  const [courses, setCourses] = useState<SettingsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/admin/courses");
      if (!response.ok) throw new Error("load failed");
      const data = await response.json();
      setCourses(Array.isArray(data) ? data : (data.courses ?? []));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title={t("الإعدادات", "Settings")} subtitle={t("إعدادات الإدارة العامة", "General administration settings")} />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">{t("حساب المشرف", "Admin account")}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {session?.user?.name ?? ""} · {session?.user?.email ?? ""} · {session?.user?.role ?? ""}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-2">{t("المسارات التعليمية", "Learning paths")}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t("المسارات الثلاثة ثابتة ولا يمكن تعديلها أو إضافتها.", "The three paths are fixed and can't be edited or extended.")}
        </p>
        {loading ? (
          <CardSkeleton lines={3} />
        ) : loadError ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل البيانات.", "Could not load data.")}</p>
            <button type="button" onClick={() => void load()} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {COURSE_PATHS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                <span className="flex-1 text-gray-900 dark:text-white">
                  {t(COURSE_PATH_LABELS[key].ar, COURSE_PATH_LABELS[key].en)} <span className="text-xs text-gray-400" dir="ltr">{key}</span>
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {courses.filter((course) => course.path === key).length} {t("دورات", "courses")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
