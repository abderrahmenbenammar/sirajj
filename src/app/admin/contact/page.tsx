"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import SirajTooltip from "@/components/ui/SirajTooltip";
import type { AdminContact } from "@/components/admin/types";

export default function AdminContactPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [contactMessages, setContactMessages] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadContactMessages = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/admin/contact");
      if (!response.ok) throw new Error("load failed");
      setContactMessages(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContactMessages();
  }, [loadContactMessages]);

  const markMessage = async (messageId: string, status: string) => {
    const response = await fetch(`/api/admin/contact/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) await loadContactMessages();
    else notify(t("تعذر تحديث الرسالة", "Could not update message"), "error");
  };

  return (
    <div>
      <PageHeader title={t("الرسائل", "Messages")} subtitle={t("رسائل التواصل من الزوار", "Contact messages from visitors")} />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        {loading ? (
          <ListSkeleton rows={4} />
        ) : loadError ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل الرسائل.", "Could not load messages.")}</p>
            <button type="button" onClick={() => void loadContactMessages()} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : contactMessages.length > 0 ? (
          <div className="space-y-2">
            {contactMessages.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {item.subject} · {item.name}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{item.status}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{item.message}</p>
                <div className="flex gap-1 mt-2">
                  {(["new", "read", "replied"] as const).map((status) => (
                    <SirajTooltip
                      key={status}
                      label={
                        status === "new"
                          ? t("رسالة جديدة لم تُفتح بعد", "New message, not yet opened")
                          : status === "read"
                            ? t("تم مشاهدة محتوى الرسالة", "Message content was viewed")
                            : t("تم ردّ المشرف على الرسالة", "The admin replied to the message")
                      }
                      side="bottom"
                    >
                      <button
                        type="button"
                        disabled={item.status === status}
                        onClick={() => void markMessage(item.id, status)}
                        className="text-xs px-2 py-1 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                      >
                        {status}
                      </button>
                    </SirajTooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد رسائل.", "No messages.")}</p>
        )}
      </div>
      <SirajDialog {...dialog} />
    </div>
  );
}
