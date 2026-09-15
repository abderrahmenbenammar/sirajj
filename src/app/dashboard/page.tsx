"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GraduationCap, BookOpen, Award, TrendingUp, PlayCircle, ArrowLeft, ArrowRight } from "lucide-react";

interface OverviewCourse {
  id: string;
  titleAr: string;
  titleEn: string;
  coverImageUrl: string | null;
  instructorAr: string;
  instructorEn: string;
  completion: number;
  status: string;
  totalLessons: number;
  doneLessons: number;
}

interface Overview {
  user: { fullName: string; email: string; createdAt: string };
  courses: OverviewCourse[];
  stats: { active: number; completed: number; lessonsDone: number; certificates: number };
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") router.replace("/admin");
  }, [user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/me/overview")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Overview | null) => {
        if (data) setOverview(data);
      })
      .catch(() => undefined);
  }, [isAuthenticated]);

  if (!isAuthenticated || user?.role === "ADMIN") {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("يرجى تسجيل الدخول", "Please sign in")}</h1>
        <Link href="/auth/login" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("تسجيل الدخول", "Sign In")}</Link>
      </div>
    );
  }

  const stats = overview?.stats ?? { active: 0, completed: 0, lessonsDone: 0, certificates: 0 };
  const activeCourses = (overview?.courses ?? []).filter((course) => course.status !== "completed");

  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {t("مرحباً بك،", "Welcome back,")} {user?.name?.split(" ")[0] || t("طالب", "Student")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t("تابع تقدمك في رحلة طلب العلم", "Continue your progress in the knowledge journey")}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <img
              src="/siraj-logo.png"
              alt={t("سراج", "SIRAJ")}
              width={1254}
              height={1254}
              className="h-12 sm:h-14 w-auto object-contain"
            />
            <img
              src="/siraj-wordmark.png"
              alt=""
              width={2048}
              height={2048}
              className="h-16 aspect-[1284/742] w-auto object-cover object-center"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <BookOpen size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("الدورات النشطة", "Active Courses")}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
              <GraduationCap size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("الدورات المكتملة", "Completed")}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
              <TrendingUp size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lessonsDone}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("الدروس المكتملة", "Lessons Completed")}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
              <Award size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.certificates}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("الشهادات", "Certificates")}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Active Courses */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("الدورات النشطة", "Active Courses")}</h2>
              <Link href="/courses" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                {t("عرض الكل", "View All")}
                {lang === "ar" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </Link>
            </div>
            <div className="space-y-4">
              {activeCourses.length > 0 ? (
                activeCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5 hover:shadow-lg transition-all duration-200 group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 flex items-center justify-center shrink-0">
                      <span className="text-xl font-bold text-emerald-700/50 dark:text-emerald-400/30" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                        {course.titleAr.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {t(course.titleAr, course.titleEn)}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(course.instructorAr, course.instructorEn)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${course.completion}%` }} />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{course.completion}%</span>
                      </div>
                    </div>
                    <ArrowLeft size={16} className="text-gray-400 group-hover:text-emerald-500 transition-colors shrink-0" />
                  </Link>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("لم تبدأ أي دورة بعد. استكشف الدورات وابدأ رحلتك.", "You have not started any course yet. Explore courses and start your journey.")}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Continue Learning */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{t("متابعة التعلم", "Continue Learning")}</h3>
              <div className="space-y-3">
                {activeCourses.length > 0 ? (
                  activeCourses.slice(0, 3).map((course) => (
                    <Link key={course.id} href={`/courses/${course.id}`} className="flex items-start gap-3 group">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                        <PlayCircle size={14} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{t(course.titleAr, course.titleEn)}</p>
                        <p className="text-xs text-gray-400">{course.doneLessons} / {course.totalLessons} {t("دروس", "lessons")}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("لا يوجد نشاط بعد.", "No activity yet.")}</p>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{t("روابط سريعة", "Quick Links")}</h3>
              <div className="space-y-2">
                {[
                  { href: "/dashboard/profile", label: t("الملف الشخصي", "Profile") },
                  { href: "/dashboard/certificates", label: t("الشهادات", "Certificates") },
                  { href: "/dashboard/settings", label: t("الإعدادات", "Settings") },
                  { href: "/library", label: t("المكتبة", "Library") },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
