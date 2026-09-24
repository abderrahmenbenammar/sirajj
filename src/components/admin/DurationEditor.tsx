"use client";

import { formatDurationDetailed } from "@/lib/certificates/layout";
import { parseDurationFields } from "./format";

// Shared manual course-duration editor (hours + minutes with live preview).
// Used by both the add-course form and the course editor so the same
// component/logic applies everywhere: hours >= 0, minutes 0–59, both empty
// (or 0+0) means "unspecified" (null). Purely presentational — validation on
// save stays with the caller, and the backend re-validates regardless.
export default function DurationEditor({
  hours,
  minutes,
  onChange,
  t,
}: {
  hours: string;
  minutes: string;
  onChange: (hours: string, minutes: string) => void;
  t: (ar: string, en: string) => string;
}) {
  const parsed = parseDurationFields(hours, minutes);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("مدة الدورة", "Course duration")}</h3>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            dir="ltr"
            value={hours}
            onChange={(e) => onChange(e.target.value, minutes)}
            placeholder="0"
            aria-label={t("الساعات", "Hours")}
            className="admin-input w-24 text-center"
          />
          {t("ساعة", "hour(s)")}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="number"
            min={0}
            max={59}
            step={1}
            inputMode="numeric"
            dir="ltr"
            value={minutes}
            onChange={(e) => onChange(hours, e.target.value)}
            placeholder="0"
            aria-label={t("الدقائق", "Minutes")}
            className="admin-input w-24 text-center"
          />
          {t("دقيقة", "minute(s)")}
        </label>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t("المدة", "Duration")}:{" "}
        {parsed === "INVALID" ? (
          <span className="text-red-600 dark:text-red-400 font-medium">
            {t("قيمة غير صالحة: ساعات ≥ 0 ودقائق من 0 إلى 59", "Invalid value: hours ≥ 0 and minutes 0–59")}
          </span>
        ) : (
          <strong>{formatDurationDetailed(parsed)}</strong>
        )}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("اترك الحقلين فارغين لتصبح المدة غير محددة.", "Leave both fields empty for an unspecified duration.")}
      </p>
    </div>
  );
}
