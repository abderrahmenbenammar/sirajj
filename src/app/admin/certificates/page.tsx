"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import type { AdminCertificate } from "@/components/admin/types";

export default function AdminCertificatesPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [certSearch, setCertSearch] = useState("");

  const loadCertificates = useCallback(async (query = "") => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/admin/certificates${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
      if (!response.ok) throw new Error("load failed");
      setCertificates(await response.json());
    } catch {
      setLoadError(true);
      notify(t("تعذر تحميل الشهادات.", "Could not load certificates."), "error");
    } finally {
      setLoading(false);
    }
  }, [t, notify]);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  return (
    <div>
      <PageHeader title={t("الشهادات", "Certificates")} subtitle={t("سجل الشهادات الصادرة", "Issued certificates registry")} />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadCertificates(certSearch);
          }}
          className="flex gap-2 mb-4"
        >
          <input
            value={certSearch}
            onChange={(e) => setCertSearch(e.target.value)}
            placeholder={t("بحث برقم الشهادة أو الاسم...", "Search by code or name...")}
            className="admin-input flex-1"
          />
          <button type="submit" className="admin-button w-auto px-6">
            {t("بحث", "Search")}
          </button>
        </form>
        {loading ? (
          <ListSkeleton rows={5} />
        ) : loadError ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل الشهادات.", "Could not load certificates.")}</p>
            <button type="button" onClick={() => void loadCertificates(certSearch)} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : certificates.length > 0 ? (
          <div className="space-y-2">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                <div className="min-w-0">
                  <span className="block text-gray-900 dark:text-white truncate">
                    {cert.student.fullName} · {cert.course.titleAr}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {cert.certificateCode} · {new Date(cert.issueDate).toLocaleDateString("ar")}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{cert.student.email}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد شهادات صادرة بعد.", "No certificates issued yet.")}</p>
        )}
      </div>
      <SirajDialog {...dialog} />
    </div>
  );
}
