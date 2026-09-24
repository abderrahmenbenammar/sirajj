"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import type { AdminSubscriber } from "@/components/admin/types";

export default function AdminNewsletterPage() {
  const { t } = useLang();
  const [newsletterSubs, setNewsletterSubs] = useState<AdminSubscriber[]>([]);
  const [subscriberTotal, setSubscriberTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadNewsletterSubs = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/admin/newsletter");
      if (!response.ok) throw new Error("load failed");
      const data = await response.json();
      setNewsletterSubs(Array.isArray(data.subscribers) ? data.subscribers : []);
      setSubscriberTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNewsletterSubs();
  }, [loadNewsletterSubs]);

  return (
    <div>
      <PageHeader title={t("النشرة البريدية", "Newsletter")} subtitle={t("مشتركو النشرة البريدية", "Newsletter subscribers")} />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">
          {t("مشتركو النشرة", "Newsletter subscribers")} ({subscriberTotal})
        </h2>
        {loading ? (
          <ListSkeleton rows={5} />
        ) : loadError ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل المشتركين.", "Could not load subscribers.")}</p>
            <button type="button" onClick={() => void loadNewsletterSubs()} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : newsletterSubs.length > 0 ? (
          <div className="space-y-2">
            {newsletterSubs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                <span className="text-gray-900 dark:text-white truncate" dir="ltr">
                  {sub.email}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{new Date(sub.subscribedAt).toLocaleDateString("ar")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا يوجد مشتركون بعد.", "No subscribers yet.")}</p>
        )}
      </div>
    </div>
  );
}
