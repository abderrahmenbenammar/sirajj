"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, Compass } from "lucide-react";
import { useLang } from "@/lib/lang-context";

function BrowseCoursesLink({ label }: { label: { ar: string; en: string } }) {
  const { t, lang } = useLang();
  return (
    <Link
      href="/courses"
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
    >
      {t(label.ar, label.en)}
      {lang === "ar" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
    </Link>
  );
}

export function CoursesEmptyState() {
  const { t } = useLang();

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
        <Compass size={26} />
      </span>
      <h3 className="text-base font-bold text-gray-900 dark:text-white">
        {t("لم تسجل في أي دورة بعد", "You have not enrolled in any course yet")}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
        {t(
          "ابدأ رحلة طلب العلم واستكشف دوراتنا في العلوم الشرعية — الدروس متاحة لك في أي وقت.",
          "Start your knowledge journey and explore our Islamic courses — lessons are available anytime.",
        )}
      </p>
      <div className="mt-6">
        <BrowseCoursesLink label={{ ar: "تصفح الدورات", en: "Browse Courses" }} />
      </div>
    </div>
  );
}

export function CertificatesEmptyState() {
  const { t } = useLang();

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/60 dark:text-amber-400">
        <Award size={26} />
      </span>
      <h3 className="text-base font-bold text-gray-900 dark:text-white">
        {t("لا توجد شهادات بعد", "No certificates yet")}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
        {t(
          "أتمّ دوراتك واجتز الاختبارات لتحصل على شهادات معتمدة توثّق تقدمك في طلب العلم.",
          "Complete your courses and pass the exams to earn accredited certificates that document your progress.",
        )}
      </p>
      <div className="mt-6">
        <BrowseCoursesLink label={{ ar: "ابدأ أول دورة", en: "Start your first course" }} />
      </div>
    </div>
  );
}
