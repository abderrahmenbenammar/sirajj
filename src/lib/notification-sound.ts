"use client";

// Custom notification sound (/notification.mp3) gated by the per-user
// `notificationSoundEnabled` preference. The value is cached in-memory so
// every notification poll does not hit the API; the settings toggle refreshes
// it optimistically through setNotificationSoundPreference().

let cachedEnabled: boolean | null = null;

export function setNotificationSoundPreference(enabled: boolean): void {
  cachedEnabled = enabled;
}

async function isSoundEnabled(): Promise<boolean> {
  if (cachedEnabled !== null) return cachedEnabled;
  try {
    const res = await fetch("/api/auth/update-profile", { cache: "no-store" });
    if (res.ok) {
      const data: unknown = await res.json();
      const value = (data as { notificationSoundEnabled?: unknown } | null)?.notificationSoundEnabled;
      if (typeof value === "boolean") {
        cachedEnabled = value;
        return value;
      }
    }
  } catch {
    // الشبكة غير متاحة — نعتمد على القيمة الافتراضية (مفعّل)
  }
  return cachedEnabled ?? true;
}

// Plays the custom sound only when the preference allows it. Never throws:
// autoplay restrictions or decode failures must not break the caller.
export async function playNotificationSound(): Promise<void> {
  try {
    if (!(await isSoundEnabled())) return;
    const audio = new Audio("/notification.mp3");
    audio.volume = 0.7;
    await audio.play();
  } catch {
    // صامت: قيود التشغيل التلقائي أو فشل فك الترميز
  }
}
