"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Avoid caching surprises during development.
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    const register = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) return;
        // Proactively check for updates without blocking render.
        void registration.update?.();
      } catch (error) {
        // SW is progressive enhancement — never break the app if it fails.
        console.warn("[pwa] service worker registration failed:", error);
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
