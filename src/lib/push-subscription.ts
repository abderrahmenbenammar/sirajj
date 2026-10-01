"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";

export type PushStatus = "loading" | "unsupported" | "denied" | "unsubscribed" | "subscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Web Push subscription lifecycle: reports the current state and exposes
// `enable()` which requests permission, registers the service worker,
// subscribes with the VAPID public key and persists the subscription on
// the server. Every failure degrades to an error message — the bell never
// breaks.
export function usePushSubscription() {
  const { t } = useLang();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) return;
    let active = true;
    const readState = async () => {
      try {
        if (Notification.permission === "denied") {
          if (active) setStatus("denied");
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (active) setStatus(subscription ? "subscribed" : "unsubscribed");
      } catch {
        if (active) setStatus("unsubscribed");
      }
    };
    readState();
    return () => {
      active = false;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported || registering) return;
    setRegistering(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError(t("مفتاح VAPID غير مكوّن في الخادم", "VAPID key is not configured on the server"));
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        // The server did not store it — undo the browser-side subscription
        // so UI state and reality stay consistent.
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error(`HTTP ${response.status}`);
      }
      setStatus("subscribed");
    } catch (err) {
      console.error("[push] failed to enable push notifications", err);
      setError(t("تعذر تفعيل الإشعارات الفورية، حاول مجددًا", "Could not enable push notifications, try again"));
    } finally {
      setRegistering(false);
    }
  }, [supported, registering, t]);

  // Unsupported browsers report "unsupported" without a state transition
  // (keeps setState out of the synchronous effect body).
  return { status: supported ? status : "unsupported", registering, error, enable };
}
