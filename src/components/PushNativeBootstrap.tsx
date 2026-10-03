"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type PushNotificationToken,
} from "@capacitor/push-notifications";
import { LocalNotifications, type LocalNotificationSchema } from "@capacitor/local-notifications";
import { useAuth } from "@/lib/auth-context";
import { ensurePushPermission } from "@/lib/push-permissions";

// Must match AndroidManifest's com.google.firebase.messaging.default_notification_channel_id
// AND the channelId used by src/lib/fcm.ts.
const CHANNEL_ID = "siraj_default_channel";

// Module-level guard: listeners attach exactly once per app session.
// (The component lives in the root layout and never unmounts; this also
// keeps React StrictMode's double effect invocation from duplicating them.)
let listenersAttached = false;

async function attachListeners(router: ReturnType<typeof useRouter>): Promise<void> {
  // Each step is isolated: one failing native call must never prevent the
  // rest from attaching, and nothing may throw out of this function.
  try {
    // Created BEFORE register() so messages always have a valid channel.
    // importance 5 (MAX) = heads-up popup + sound + vibration, like WhatsApp.
    // visibility 1 = show on lock screen (PUBLIC).
    // `sound` is intentionally omitted: the plugin maps it to a raw/ resource,
    // so the literal value "default" would point at a nonexistent file and make
    // the channel SILENT. Omitting it keeps NotificationChannel's default sound.
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: "إشعارات سراج",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch (error) {
    console.error("[push-native] createChannel failed", error);
  }

  try {
    await PushNotifications.addListener("registration", (token: PushNotificationToken) => {
      if (!token?.value) return;
      // Fire-and-forget: token upload is idempotent (upsert by token) and
      // retried on next app start / next login if it fails.
      void fetch("/api/notifications/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value, platform: "ANDROID_FCM" }),
        keepalive: true,
      }).catch((error) => console.error("[push-native] token upload failed", error));
    });
  } catch (error) {
    console.error("[push-native] registration listener failed", error);
  }

  try {
    await PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification: PushNotificationSchema) => {
        console.info("[push-native] received in foreground:", notification.title);
        // Android does NOT show FCM notification messages in the system tray
        // while the app is in the foreground — mirror the message as a local
        // notification on the same channel so the user still gets the status-bar
        // banner, lock-screen entry, sound and vibration (channel importance 5).
        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: notification.title || "سراج",
                body: notification.body || "",
                // LocalNotification ids must fit a Java int — keep it in range.
                id: Date.now() % 2147483647,
                channelId: CHANNEL_ID,
                extra: notification.data,
              },
            ],
          });
        } catch (error) {
          console.error("[push-native] foreground local notification failed", error);
        }
      },
    );
  } catch (error) {
    console.error("[push-native] pushNotificationReceived listener failed", error);
  }

  // Tapping the foreground banner (or one tapped while backgrounded) navigates
  // to the payload's relative URL.
  try {
    await LocalNotifications.addListener(
      "localNotificationReceived",
      (notification: LocalNotificationSchema) => {
        try {
          const url = (notification.extra as { url?: unknown } | undefined)?.url;
          if (typeof url === "string" && url.startsWith("/")) {
            router.push(url);
          }
        } catch (error) {
          console.error("[push-native] local notification navigation failed", error);
        }
      },
    );
  } catch (error) {
    console.error("[push-native] localNotificationReceived listener failed", error);
  }

  try {
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification: ActionPerformed) => {
        try {
          const data = notification.notification?.data as { url?: unknown } | undefined;
          if (typeof data?.url === "string" && data.url.startsWith("/")) {
            router.push(data.url);
          }
        } catch (error) {
          console.error("[push-native] action navigation failed", error);
        }
      },
    );
  } catch (error) {
    console.error("[push-native] pushNotificationActionPerformed listener failed", error);
  }
}

export default function PushNativeBootstrap() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();

  // App startup (native only): channel + listeners, then make sure the
  // permission prompt has been shown at least once (so Android Settings
  // never stays in the "no permissions requested" state).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!listenersAttached) {
      listenersAttached = true;
      void attachListeners(router);
    }
    void ensurePushPermission()
      .then((state) => {
        if (state !== null && state !== "granted") {
          console.info("[push-native] startup permission not granted:", state);
        }
      })
      .catch((error) => console.error("[push-native] startup permission check failed", error));
  }, [router]);

  // On login (native only): ensure permission, then register with FCM.
  // The resulting `registration` event uploads the token for this user.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (isAuthLoading || !isAuthenticated) return;
    void (async () => {
      try {
        const state = await ensurePushPermission();
        if (state !== "granted") {
          console.info("[push-native] notification permission not granted:", state);
          return;
        }
        await PushNotifications.register();
      } catch (error) {
        // Missing google-services.json rejects here (never crashes the app:
        // the native side was patched to reject instead of throwing).
        console.error(
          "[push-native] register failed (missing google-services.json?)",
          error,
        );
      }
    })();
  }, [isAuthLoading, isAuthenticated]);

  return null;
}
