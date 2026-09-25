"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import SirajTooltip from "@/components/ui/SirajTooltip";
import type { Subscriber, SubscriberDetails } from "@/components/admin/types";

export default function AdminUsersPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const loadSubscribers = useCallback(async (query = "") => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/admin/users${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
      if (!response.ok) throw new Error("load failed");
      setSubscribers(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscribers();
  }, [loadSubscribers]);

  const showSubscriberDetails = async (subscriberId: string) => {
    setDetailsLoading(true);
    const response = await fetch(`/api/admin/users/${subscriberId}`);
    if (response.ok) setSelectedSubscriber(await response.json());
    setDetailsLoading(false);
  };

  const updateSubscriber = async (subscriberId: string, patch: { role?: string; status?: string }, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    const response = await fetch(`/api/admin/users/${subscriberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم تحديث المشترك", "Subscriber updated") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
    if (response.ok) {
      await loadSubscribers(userSearch);
      if (selectedSubscriber?.id === subscriberId) await showSubscriberDetails(subscriberId);
    }
  };

  const admins = subscribers.filter((s) => s.role === "ADMIN").length;
  const students = subscribers.length - admins;

  return (
    <div>
      <PageHeader title={t("المستخدمون", "Users")} subtitle={t("إدارة الطلاب والمستخدمين", "Manage students and users")} />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : loadError ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل المستخدمين.", "Could not load users.")}</p>
          <button type="button" onClick={() => void loadSubscribers(userSearch)} className="admin-button w-auto px-6">
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatCard title={t("إجمالي المستخدمين", "Total users")} value={subscribers.length} icon={Users} />
            <StatCard title={t("طلاب", "Students")} value={students} icon={Users} />
            <StatCard title={t("مشرفون", "Admins")} value={admins} icon={Users} />
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void loadSubscribers(userSearch);
              }}
              className="flex gap-2 mb-4"
            >
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t("بحث بالبريد أو الاسم...", "Search by email or name...")} aria-label={t("بحث بالبريد أو الاسم...", "Search by email or name...")}
                className="admin-input flex-1"
              />
              <button type="submit" className="admin-button w-auto px-6">
                {t("بحث", "Search")}
              </button>
            </form>
            {subscribers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-3 text-start">{t("الاسم", "Name")}</th>
                      <th className="p-3 text-start">{t("البريد", "Email")}</th>
                      <th className="p-3 text-start">{t("التسجيل", "Joined")}</th>
                      <th className="p-3 text-start">{t("الدورات", "Courses")}</th>
                      <th className="p-3 text-start">{t("الدور", "Role")}</th>
                      <th className="p-3 text-start">{t("الحالة", "Status")}</th>
                      <th className="p-3 text-start">{t("إجراءات", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="border-b border-gray-100 dark:border-gray-800/70 text-gray-700 dark:text-gray-300">
                        <td className="p-3">
                          <SirajTooltip label={t("عرض الملف الكامل للمشترك", "View the subscriber's full profile")} side="top">
                            <button
                              type="button"
                              disabled={detailsLoading}
                              onClick={() => void showSubscriberDetails(subscriber.id)}
                              className="inline-flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
                              aria-label={`${t("عرض ملف", "View profile")} ${subscriber.fullName}`}
                            >
                              <Users size={15} />
                              {subscriber.fullName}
                            </button>
                          </SirajTooltip>
                        </td>
                        <td className="p-3">{subscriber.email}</td>
                        <td className="p-3">{new Date(subscriber.createdAt).toLocaleDateString("ar")}</td>
                        <td className="p-3">{subscriber._count.courseProgress}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-lg ${subscriber.role === "ADMIN" ? "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                            {subscriber.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-lg ${subscriber.status === "ACTIVE" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"}`}>
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {subscriber.role === "ADMIN" ? (
                              <SirajTooltip label={t("تحويل المشترك إلى دور طالب", "Convert the subscriber to a student role")} side="top">
                                <button type="button" onClick={() => void updateSubscriber(subscriber.id, { role: "STUDENT" }, t("تحويل لطالب؟", "Convert to Student?"))} className="px-2 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                                  {t("تحويل لطالب", "Convert to Student")}
                                </button>
                              </SirajTooltip>
                            ) : (
                              <SirajTooltip label={t("منح المشترك صلاحيات المشرف", "Grant the subscriber admin permissions")} side="top">
                                <button type="button" onClick={() => void updateSubscriber(subscriber.id, { role: "ADMIN" }, t("ترقية لمشرف؟", "Promote to Admin?"))} className="px-2 py-1 text-xs rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                                  {t("ترقية لمشرف", "Promote to Admin")}
                                </button>
                              </SirajTooltip>
                            )}
                            {subscriber.status === "ACTIVE" ? (
                              <SirajTooltip label={t("منع هذا الحساب من تسجيل الدخول (يمكن التفعيل لاحقاً)", "Prevent this account from signing in (can re-enable later)")} side="top">
                                <button type="button" onClick={() => void updateSubscriber(subscriber.id, { status: "DISABLED" }, t("تعطيل هذا الحساب؟", "Disable this account?"))} className="px-2 py-1 text-xs rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                  {t("تعطيل", "Disable")}
                                </button>
                              </SirajTooltip>
                            ) : (
                              <SirajTooltip label={t("إعادة تفعيل تسجيل الدخول لهذا الحساب", "Re-enable sign-in for this account")} side="top">
                                <button type="button" onClick={() => void updateSubscriber(subscriber.id, { status: "ACTIVE" }, t("تفعيل هذا الحساب؟", "Enable this account?"))} className="px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                                  {t("تفعيل", "Enable")}
                                </button>
                              </SirajTooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا يوجد مشتركون بعد.", "No subscribers yet.")}</p>
            )}
          </div>

          {selectedSubscriber && (
            <div className="mt-6 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">{t("ملف المشترك", "Subscriber profile")}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedSubscriber.fullName} · {selectedSubscriber.email} · {selectedSubscriber.role} · {selectedSubscriber.status}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedSubscriber(null)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("إغلاق الملف", "Close profile")}>
                  <X size={18} />
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mb-6 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="block text-xs text-gray-500 mb-1">{t("تاريخ التسجيل", "Joined")}</span>
                  {new Date(selectedSubscriber.createdAt).toLocaleDateString("ar")}
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="block text-xs text-gray-500 mb-1">{t("المزوّد", "Provider")}</span>
                  {selectedSubscriber.authProvider}
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="block text-xs text-gray-500 mb-1">{t("الدروس المكتملة", "Completed lessons")}</span>
                  {selectedSubscriber.lessonCompletions.length}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t("تقدم الدورات", "Course progress")}</h3>
              {selectedSubscriber.courseProgress.length > 0 ? (
                <div className="space-y-2 mb-6">
                  {selectedSubscriber.courseProgress.map((entry) => (
                    <div key={entry.course.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                      <span className="text-gray-900 dark:text-white">{entry.course.titleAr}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.status} · {String(entry.completionPercentage)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-6">{t("لم يسجل في دورات بعد.", "No course enrollments yet.")}</p>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t("تقدم الدروس", "Lesson progress")}</h3>
              {selectedSubscriber.lessonCompletions.length > 0 ? (
                <div className="space-y-2">
                  {selectedSubscriber.lessonCompletions.map((item, index) => (
                    <div key={`${item.lesson.course.titleAr}-${item.lesson.orderIndex}-${index}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.lesson.course.titleAr}: {item.lesson.titleAr}
                      </span>
                      <span className="text-emerald-600">{new Date(item.completedAt).toLocaleDateString("ar")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t("لا يوجد تقدم مسجل بعد.", "No progress recorded yet.")}</p>
              )}
            </div>
          )}
        </>
      )}
      <SirajDialog {...dialog} />
    </div>
  );
}
