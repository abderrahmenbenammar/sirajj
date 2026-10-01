"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useLang } from "@/lib/lang-context";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function formatRelativeDate(iso: string, locale: string): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function parseNotifications(body: unknown): NotificationItem[] {
  const list = (body as { notifications?: unknown } | null)?.notifications;
  return Array.isArray(list) ? (list as NotificationItem[]) : [];
}

// Navbar bell: fetches the signed-in user's latest notifications, shows the
// unread badge, marks one or all as read (optimistically + PATCH), and
// navigates to the notification's link. A failed fetch just shows an empty
// list — the navbar never breaks.
export default function NotificationBell() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      })
      .then((body: unknown) => {
        if (active) setNotifications(parseNotifications(body));
      })
      .catch(() => {
        if (active) setNotifications([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotifications(parseNotifications(await response.json()));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unreadCount = notifications.reduce((count, notification) => (notification.read ? count : count + 1), 0);

  const patchMarkRead = (payload: { id?: string; unreadOnly?: boolean }) => {
    void fetch("/api/notifications/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  };

  const toggle = () => {
    if (!open) void refresh();
    setOpen(!open);
  };

  const handleSelect = (notification: NotificationItem) => {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
      );
      patchMarkRead({ id: notification.id });
    }
    setOpen(false);
    if (notification.link) router.push(notification.link);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    patchMarkRead({ unreadOnly: true });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={t("الإشعارات", "Notifications")}
        aria-expanded={open}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-50">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {t("الإشعارات", "Notifications")}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
              >
                <CheckCheck size={13} />
                {t("تعليم الكل كمقروء", "Mark all as read")}
              </button>
            )}
          </div>

          {loading ? (
            <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              {t("جارٍ التحميل...", "Loading...")}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              {t("لا توجد إشعارات", "No notifications")}
            </p>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className={`w-full text-start px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${
                      notification.read ? "" : "bg-emerald-50/60 dark:bg-emerald-950/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-sm ${
                            notification.read
                              ? "text-gray-700 dark:text-gray-200"
                              : "font-semibold text-gray-900 dark:text-white"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                          {formatRelativeDate(notification.createdAt, lang)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
