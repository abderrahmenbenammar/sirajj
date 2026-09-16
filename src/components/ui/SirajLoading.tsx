"use client";

import { useLang } from "@/lib/lang-context";

export default function SirajLoading() {
  const { lang } = useLang();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={lang === "en" ? "Loading..." : "جارٍ التحميل..."}
      className="min-h-[50vh] flex flex-col items-center justify-center gap-5 px-4 py-16"
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <img
          src="/siraj-logo.png"
          alt=""
          width={1254}
          height={1254}
          className="h-9 sm:h-11 w-auto object-contain shrink-0"
        />
        <img
          src="/siraj-wordmark.png"
          alt=""
          width={2048}
          height={2048}
          className="h-12 sm:h-14 aspect-[1284/742] w-auto object-cover object-center shrink-0"
        />
        <img
          src="/siraj-logo.png"
          alt=""
          width={1254}
          height={1254}
          className="h-9 sm:h-11 w-auto object-contain shrink-0"
        />
      </div>
      <div
        aria-hidden="true"
        className="h-9 w-9 rounded-full border-2 border-gray-200 dark:border-gray-800 border-t-emerald-600 dark:border-t-emerald-400 animate-spin"
      />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {lang === "en" ? "Loading..." : "جارٍ التحميل..."}
      </p>
    </div>
  );
}
