"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  href,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{hint}</p>}
      </div>
      <span className="shrink-0 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
        <Icon size={20} />
      </span>
    </div>
  );
  const cls =
    "block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 transition-shadow duration-200 hover:shadow-sm";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}
