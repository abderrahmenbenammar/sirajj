"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, Download, PlusSquare, Share2, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";

/** `beforeinstallprompt` is not part of the standard TypeScript DOM lib yet. */
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
const SHOWN_STORAGE_KEY = "pwa_prompt_last_shown";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const ENGAGEMENT_DELAY_MS = 20 * 1000;

// Keep rate limiting effective for the current page if browser storage is blocked.
let dismissedAtInMemory: number | null = null;
let shownAtInMemory: number | null = null;

function rememberDismissal(): void {
  dismissedAtInMemory = Date.now();
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(dismissedAtInMemory));
  } catch {
    // The in-memory timestamp still prevents repeated prompts in this page session.
  }
}

function isWithinCooldown(storageKey: string, inMemoryTimestamp: number | null): boolean {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null || raw === "") {
      return inMemoryTimestamp !== null && Date.now() - inMemoryTimestamp < COOLDOWN_MS;
    }
    if (raw === "true" && storageKey === DISMISS_STORAGE_KEY) return true;

    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp) || timestamp > Date.now()) {
      window.localStorage.removeItem(storageKey);
      return false;
    }
    return Date.now() - timestamp < COOLDOWN_MS;
  } catch {
    return inMemoryTimestamp !== null && Date.now() - inMemoryTimestamp < COOLDOWN_MS;
  }
}

function rememberPromptShown(): void {
  shownAtInMemory = Date.now();
  try {
    window.localStorage.setItem(SHOWN_STORAGE_KEY, String(shownAtInMemory));
  } catch {
    // The in-memory timestamp still prevents repeated prompts in this page session.
  }
}

function isAppInstalled(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  return (window.navigator as StandaloneNavigator).standalone === true;
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
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);
  const [installSource, setInstallSource] = useState<InstallSource>("prompt");
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isAppInstalled()) return;
    if (isWithinCooldown(DISMISS_STORAGE_KEY, dismissedAtInMemory)) return;
    if (isWithinCooldown(SHOWN_STORAGE_KEY, shownAtInMemory)) return;

    const isIos = isIosSafari();
    let installAvailable = isIos;
    let userHasEngaged = false;
    let hasWaitedAfterEngagement = false;
    let alreadyShown = false;
    let remainingDelay = ENGAGEMENT_DELAY_MS;
    let timer: number | null = null;
    let timerStartedAt = 0;

    const showIfReady = (): void => {
      if (
        !installAvailable ||
        !userHasEngaged ||
        !hasWaitedAfterEngagement ||
        alreadyShown ||
        document.visibilityState === "hidden"
      ) {
        return;
      }
      alreadyShown = true;
      if (isIos) setInstallSource("ios");
      rememberPromptShown();
      setVisible(true);
    };

    const pauseTimer = (): void => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
      remainingDelay = Math.max(0, remainingDelay - (Date.now() - timerStartedAt));
    };

    const startTimer = (): void => {
      if (
        timer !== null ||
        !userHasEngaged ||
        remainingDelay <= 0 ||
        document.visibilityState === "hidden"
      ) {
        return;
      }
      timerStartedAt = Date.now();
      timer = window.setTimeout(() => {
        timer = null;
        remainingDelay = 0;
        hasWaitedAfterEngagement = true;
        showIfReady();
      }, remainingDelay);
    };

    const handleEngagement = (): void => {
      if (userHasEngaged) return;
      userHasEngaged = true;
      startTimer();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") pauseTimer();
      else startTimer();
    };

    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      installAvailable = true;
      setDeferredEvent(event as BeforeInstallPromptEvent);
      setInstallSource("prompt");
      showIfReady();
    };

    const handleAppInstalled = (): void => {
      setVisible(false);
      setShown(false);
      setDeferredEvent(null);
      rememberDismissal();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("pointerdown", handleEngagement, { passive: true });
    window.addEventListener("keydown", handleEngagement);
    window.addEventListener("scroll", handleEngagement, { passive: true, once: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pointerdown", handleEngagement);
      window.removeEventListener("keydown", handleEngagement);
      window.removeEventListener("scroll", handleEngagement);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const dismiss = useCallback((): void => {
    setVisible(false);
    setShown(false);
    setDeferredEvent(null);
    rememberDismissal();
  }, []);

  const handleInstall = useCallback(async (): Promise<void> => {
    if (!deferredEvent) return;
    const promptEvent = deferredEvent;
    setDeferredEvent(null);
    setVisible(false);
    setShown(false);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      // A dismissed native prompt is also a clear signal to pause future invitations.
      rememberDismissal();
    } catch {
      // The event is one-shot. Keep the page usable if the browser rejects it.
    }
  }, [deferredEvent]);

  if (!visible) return null;

  const isIos = installSource === "ios";

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[100] sm:inset-x-auto sm:end-6 sm:bottom-6 sm:w-full sm:max-w-md">
      <section
        aria-labelledby="pwa-install-title"
        className={`pointer-events-auto overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 bg-gradient-to-br from-emerald-700 to-emerald-900 px-4 py-3 text-white">
          <Image
            src="/icons/icon-192x192.png"
            alt=""
            width={40}
            height={40}
            className="shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <h2 id="pwa-install-title" className="truncate text-sm font-bold">
              {t("ثبّت تطبيق سراج", "Install SIRAJ")}
            </h2>
            <p className="truncate text-xs text-emerald-100">
              {t("وصول أسرع إلى دروسك", "A quicker way to reach your lessons")}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("إغلاق دعوة التثبيت", "Dismiss install invitation")}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            {isIos
              ? t(
                  "أضف سراج إلى شاشتك الرئيسية لتعود إلى دوراتك بسهولة.",
                  "Add SIRAJ to your home screen for easier access to your courses.",
                )
              : t(
                  "ثبّت المنصة للوصول إليها مباشرة من جهازك.",
                  "Install the platform for quick access from your device.",
                )}
          </p>

          {isIos && (
            <ol className="mt-3 space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <li className="flex items-center gap-2.5">
                <Share2 size={15} aria-hidden="true" />
                {t("اضغط زر المشاركة في Safari", "Tap Share in Safari")}
              </li>
              <li className="flex items-center gap-2.5">
                <PlusSquare size={15} aria-hidden="true" />
                {t("اختر إضافة إلى الشاشة الرئيسية", "Choose Add to Home Screen")}
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} aria-hidden="true" />
                {t("ثم اضغط إضافة", "Then tap Add")}
              </li>
            </ol>
          )}

          <div className="mt-4 flex gap-2">
            {!isIos && (
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Download size={16} aria-hidden="true" />
                {t("تثبيت", "Install")}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t("ليس الآن", "Not now")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
