"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Check, Download, PlusSquare, Share2, X } from "lucide-react";

/**
 * `beforeinstallprompt` is not part of the standard TypeScript DOM lib yet,
 * so we declare the exact shape Chromium (Android/Desktop) exposes.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

/** iOS Safari exposes `navigator.standalone` instead of the install event. */
type StandaloneNavigator = Navigator & { readonly standalone?: boolean };

type InstallSource = "prompt" | "ios";

const DISMISS_STORAGE_KEY = "pwa_prompt_dismissed";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const IOS_SHOW_DELAY_MS = 1500;

/** No-op subscription so `useSyncExternalStore` can detect client mount. */
const emptySubscribe = (): (() => void) => () => {};

function rememberDismissal(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage may be unavailable (private mode) — dismissal just won't persist.
  }
}

function isPromptDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (raw === null || raw === "") return false;
    if (raw === "true") return true; // legacy / permanent dismissal flag
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) {
      window.localStorage.removeItem(DISMISS_STORAGE_KEY);
      return false; // corrupted value → allow prompting again
    }
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function isAppInstalled(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  return (window.navigator as StandaloneNavigator).standalone === true; // iOS
}

function isIosSafari(): boolean {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  const isIosDevice =
    /iPad|iPhone|iPod/.test(userAgent) ||
    // iPadOS 13+ masquerades as macOS but reports touch points.
    (platform === "MacIntel" && maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|Edg|OPR|Chrome/.test(userAgent);
  return isIosDevice && isSafari;
}

export default function PwaInstallPrompt(): React.JSX.Element | null {
  // Hydration-safe mount detection: `false` during SSR/first client render.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false); // enter-transition helper
  const [installSource, setInstallSource] = useState<InstallSource>("prompt");
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // a) Recently dismissed → never show.
    if (isPromptDismissed()) return;

    // b) Already installed (standalone mode) → nothing to prompt.
    if (isAppInstalled()) return;

    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    let promptEventSeen = false;

    // c) Android / Desktop Chromium: capture the deferred install event.
    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault(); // suppress the browser's native mini-bar
      promptEventSeen = true;
      setDeferredEvent(event as BeforeInstallPromptEvent);
      setInstallSource("prompt");
      setVisible(true);
    };

    const handleAppInstalled = (): void => {
      setVisible(false);
      setShown(false);
      setDeferredEvent(null);
      rememberDismissal(); // installed users never get prompted again
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // d) iOS Safari: no install event exists → show manual instructions.
    if (isIosSafari()) {
      iosTimer = setTimeout(() => {
        if (promptEventSeen) return; // a real install event already won
        setInstallSource("ios");
        setVisible(true);
      }, IOS_SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (iosTimer !== null) clearTimeout(iosTimer);
    };
  }, []);

  // Enter-transition: flip to `shown` one frame after the dialog mounts.
  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const dismiss = useCallback((): void => {
    setVisible(false);
    setShown(false);
    setDeferredEvent(null);
    rememberDismissal(); // "ليس الآن" → suppress for 30 days
  }, []);

  const handleInstall = useCallback(async (): Promise<void> => {
    if (!deferredEvent) return;
    const promptEvent = deferredEvent;
    setDeferredEvent(null);
    setVisible(false);
    setShown(false);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") rememberDismissal();
    } catch {
      // The event is one-shot — if the prompt was already consumed, do nothing.
    }
  }, [deferredEvent]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, dismiss]);

  // Hydration-safe: SSR and the first client render stay `null`.
  if (!mounted || !visible) return null;

  const isIos = installSource === "ios";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={dismiss}
        className={`absolute inset-0 cursor-default bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60 ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-desc"
        className={`relative m-4 w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 sm:m-0 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="relative flex items-center gap-3 bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 py-4 text-white">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Image
              src="/icons/icon-192x192.png"
              alt=""
              width={40}
              height={40}
              className="rounded-xl"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="pwa-install-title" className="truncate text-base font-bold">
              تثبيت تطبيق سراج
            </h2>
            <p className="truncate text-xs text-emerald-100">منصة سراج التعليمية</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p
            id="pwa-install-desc"
            className="text-sm leading-7 text-gray-600 dark:text-gray-300"
          >
            {isIos
              ? "لتثبيت التطبيق، اضغط على زر المشاركة أسفل الشاشة ثم اختر 'إضافة إلى الشاشة الرئيسية'."
              : "قم بتثبيت التطبيق للوصول السريع إلى دوراتك، حتى بدون إنترنت!"}
          </p>

          {isIos && (
            <ol className="mt-4 space-y-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Share2 size={13} />
                </span>
                اضغط على زر المشاركة أسفل الشاشة
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <PlusSquare size={13} />
                </span>
                اختر &quot;إضافة إلى الشاشة الرئيسية&quot;
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Check size={13} />
                </span>
                اضغط &quot;إضافة&quot; لإتمام التثبيت
              </li>
            </ol>
          )}

          <div className="mt-5 flex gap-2.5">
            {!isIos && (
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Download size={16} />
                تثبيت الآن
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className={`rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 ${
                isIos ? "flex-1" : ""
              }`}
            >
              ليس الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
