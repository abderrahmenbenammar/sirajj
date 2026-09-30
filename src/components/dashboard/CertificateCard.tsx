"use client";

import Link from "next/link";
import { Award, BadgeCheck, Calendar } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { DashboardCertificate } from "./types";

export default function CertificateCard({
  certificate,
}: {
  certificate: DashboardCertificate;
}) {
  const { t, lang } = useLang();

  // Format with an explicit UTC timezone: `issueDate` is a date-only column
  // (stored at UTC midnight), so the calendar day never shifts with the
  // server/browser timezone. `suppressHydrationWarning` guards the <time>
  // text against minor ICU/CLDR version differences between Node and browser.
  const formattedDate = new Date(certificate.issueDate).toLocaleDateString(
    lang === "ar" ? "ar" : "en-GB",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );

  return (
    <article className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 transition-all hover:shadow-md dark:border-amber-500/20 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/40">
      {/* Golden/emerald ribbon */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-400"
      />

      <div className="flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-600/30">
          <Award size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <BadgeCheck size={12} />
            {t("شهادة إتمام", "Completion Certificate")}
          </span>
          <h3 className="mt-2 truncate text-sm font-bold text-gray-900 dark:text-white">
            {t(certificate.courseTitleAr, certificate.courseTitleEn)}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Calendar size={13} className="shrink-0" />
            <time dateTime={certificate.issueDate} suppressHydrationWarning>
              {formattedDate}
            </time>
          </p>
          <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
            {t("رمز التحقق", "Verification code")}:{" "}
            <span className="font-mono" dir="ltr">
              {certificate.certificateCode}
            </span>
          </p>
        </div>
      </div>

      <Link
        href={`/certificates/${certificate.id}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white dark:bg-gray-950 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
      >
        {t("عرض الشهادة", "View Certificate")}
      </Link>
    </article>
  );
}
