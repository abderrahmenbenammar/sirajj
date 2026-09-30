"use client";

import Image from "next/image";
import { useLang } from "@/lib/lang-context";

export default function DashboardHeader({ firstName }: { firstName?: string }) {
  const { t } = useLang();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          {t("مرحباً بك،", "Welcome back,")} {firstName || t("طالب", "Student")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("تابع تقدمك في رحلة طلب العلم", "Continue your progress in the knowledge journey")}
        </p>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Image
          src="/siraj-logo.png"
          alt={t("سراج", "SIRAJ")}
          width={1254}
          height={1254}
          className="h-9 w-auto shrink-0 object-contain sm:h-11"
        />
        <Image
          src="/siraj-wordmark.png"
          alt=""
          width={2048}
          height={2048}
          className="aspect-[1284/742] h-12 w-auto shrink-0 object-cover object-center sm:h-15"
        />
        <Image
          src="/siraj-logo.png"
          alt=""
          width={1254}
          height={1254}
          className="h-9 w-auto shrink-0 object-contain sm:h-11"
        />
      </div>
    </div>
  );
}
