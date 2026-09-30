"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { BilingualText } from "./types";

interface SectionAction {
  label: BilingualText;
  href: string;
}

export default function DashboardSection({
  title,
  action,
  children,
}: {
  title: BilingualText;
  action?: SectionAction;
  children: ReactNode;
}) {
  const { t, lang } = useLang();

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-white">
          <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-emerald-600" />
          {t(title.ar, title.en)}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
          >
            {t(action.label.ar, action.label.en)}
            {lang === "ar" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
