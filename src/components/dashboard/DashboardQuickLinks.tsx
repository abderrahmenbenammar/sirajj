"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";

const LINKS = [
  { href: "/dashboard/profile", ar: "الملف الشخصي", en: "Profile" },
  { href: "/dashboard/certificates", ar: "الشهادات", en: "Certificates" },
  { href: "/dashboard/settings", ar: "الإعدادات", en: "Settings" },
  { href: "/library", ar: "المكتبة", en: "Library" },
] as const;

export default function DashboardQuickLinks() {
  const { t } = useLang();

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-gray-800/60 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
        {t("روابط سريعة", "Quick Links")}
      </h3>
      <div className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
          >
            {t(link.ar, link.en)}
          </Link>
        ))}
      </div>
    </div>
  );
}
