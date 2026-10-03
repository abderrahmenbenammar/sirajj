"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, type PermissionState } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Bell, CheckCheck, Smartphone } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { usePushSubscription } from "@/lib/push-subscription";
import { playNotificationSound } from "@/lib/notification-sound";
import { ensurePushPermission } from "@/lib/push-permissions";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { t, lang } = useLang();
  const router = useRouter();
  const push = usePushSubscription();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nativePermission, setNativePermission] = useState<PermissionState | null>(null);
  const [nativeRequesting, setNativeRequesting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fetchRef = useRef<(() => Promise<void>) | null>(null);
  const seenIdsRef = useRef<Set<string> | null>(null);

  // جلب الإشعارات عند التحميل + تحديث كل دقيقة. النغمة تُشغَّل فقط عند
  // وصول إشعار جديد عبر دورة التحديث (لا عند التحميل الأول أو فتح القائمة).
  useEffect(() => {
    let active = true;
    const fetchNotifications = async (playSoundOnNew: boolean) => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.notifications)) {
            const incoming: NotificationItem[] = data.notifications;
            const previous = seenIdsRef.current;
            seenIdsRef.current = new Set(incoming.map((n) => n.id));
            if (playSoundOnNew && previous && incoming.some((n) => !previous.has(n.id))) {
              void playNotificationSound();
            }
            setNotifications(incoming);
          }
        }
      } catch {
        // تجاهل الأخطاء بصمت لضمان استقرار الواجهة
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRef.current = () => fetchNotifications(false);
    void fetchNotifications(false);
    const interval = setInterval(() => void fetchNotifications(true), 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // تحديث فوري عند فتح القائمة حتى لا يكون العداد متأخراً عن دورة الـ 60 ثانية
  const handleToggle = () => {
    if (!isOpen) fetchRef.current?.();
    setIsOpen(!isOpen);
  };

  // في التطبيق الأصلي فقط: معرفة حالة إذن الإشعارات الحالية
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    PushNotifications.checkPermissions()
      .then((status) => {
        if (active) setNativePermission(status.receive);
      })
      .catch((error) => console.error("[push-native] checkPermissions failed", error));
    return () => {
      active = false;
    };
  }, []);

  // زر يدوي لإظهار نافذة طلب الإذن مرة أخرى إذا رفض المستخدمها سابقاً
  const handleEnableNative = () => {
    setNativeRequesting(true);
    void (async () => {
      try {
        const state = await ensurePushPermission();
        if (state !== null) setNativePermission(state);
        if (state === "granted") {
          // يُطلق حدث registration الذي يرفع رمز الجهاز إلى الخادم
          await PushNotifications.register();
        }
      } catch (error) {
        console.error("[push-native] manual permission enable failed", error);
      } finally {
        setNativeRequesting(false);
      }
    })();
  };

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // تحديد إشعار فردي كمقروء والانتقال للرابط — PATCH بنظام keepalive
  // (fire-and-forget) حتى لا يتأخر الانتقال لأي انتظار في الشبكة.
  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) {
      void fetch("/api/notifications/mark-read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
        keepalive: true,
      }).catch(() => undefined);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      );
    }
    setIsOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  // تحديد الكل كمقروء — أيضاً fire-and-forget مع keepalive
  const handleMarkAllAsRead = () => {
    void fetch("/api/notifications/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unreadOnly: true }),
      keepalive: true,
    }).catch(() => undefined);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر الجرس مع العداد */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={t("الإشعارات", "Notifications")}
        className="relative rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 animate-pulse">
            {unreadCount > 9 ? "+9" : unreadCount}
          </span>
        )}
      </button>

      {/* قائمة المنسدلة للإشعارات */}
      {isOpen && (
        <div className="absolute end-0 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 z-50">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {t("الإشعارات", "Notifications")}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                <CheckCheck size={14} />
                {t("قراءة الكل", "Mark all read")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("جارٍ التحميل...", "Loading...")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("لا توجد إشعارات حالياً", "No notifications right now")}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`cursor-pointer p-4 transition-colors text-start ${
                    !n.read
                      ? "bg-emerald-50/70 hover:bg-emerald-100/60 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border-s-4 border-emerald-500"
                      : "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50 opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      {n.title}
                    </h4>
                    {!n.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 mt-1" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                    {n.message}
                  </p>
                  <span className="mt-2 block text-[10px] text-gray-400">
                    {new Date(n.createdAt).toLocaleDateString(
                      lang === "ar" ? "ar" : "en-GB",
                      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* تفعيل إذن إشعارات التطبيق (Capacitor / Android) — أولاً لأنه الأهم على الجهاز */}
          {nativePermission !== null && nativePermission !== "granted" && (
            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <button
                type="button"
                onClick={handleEnableNative}
                disabled={nativeRequesting}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 disabled:opacity-50"
              >
                <Smartphone size={14} />
                {nativeRequesting
                  ? t("جارٍ التفعيل...", "Enabling...")
                  : t("تفعيل إشعارات التطبيق", "Enable app notifications")}
              </button>
              {nativePermission === "denied" && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t(
                    "تم رفض الإذن — فعّله من إعدادات النظام إذا لم تظهر النافذة",
                    "Permission denied — enable it in system settings if no dialog appears",
                  )}
                </p>
              )}
            </div>
          )}

          {/* تفعيل الإشعارات الفورية (Web Push) */}
          {push.status !== "unsupported" && push.status !== "loading" && (
            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              {push.status === "subscribed" ? (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCheck size={14} />
                  {t("الإشعارات الفورية مفعلة", "Push notifications enabled")}
                </p>
              ) : push.status === "denied" ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t(
                    "تم رفض إذن الإشعارات — فعّله من إعدادات المتصفح",
                    "Notification permission was blocked — enable it in your browser settings",
                  )}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void push.enable()}
                  disabled={push.registering}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 disabled:opacity-50"
                >
                  <Bell size={14} />
                  {push.registering
                    ? t("جارٍ التفعيل...", "Enabling...")
                    : t("تفعيل الإشعارات الفورية", "Enable push notifications")}
                </button>
              )}
              {push.error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{push.error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
