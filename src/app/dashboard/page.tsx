"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GraduationCap, BookOpen, Award, FileText, PlayCircle, ArrowLeft, ArrowRight } from "lucide-react";
import SirajLoading from "@/components/ui/SirajLoading";

interface LessonRef {
  id: string;
  titleAr: string;
  titleEn: string;
  orderIndex: number;
}

interface CompletedRef extends LessonRef {
  completedAt: string;
}

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
  lastCompletedLesson: CompletedRef | null;
  nextLesson: LessonRef | null;
  lastActivityAt: string | null;
}

type ActivityItem =
  | { kind: "lesson"; date: string; courseId: string; lessonTitleAr: string; lessonTitleEn: string; courseTitleAr: string; courseTitleEn: string }
  | { kind: "exam"; date: string; examId: string; examTitleAr: string; examTitleEn: string; courseTitleAr: string; courseTitleEn: string }
  | { kind: "certificate"; date: string; certificateId: string; courseTitleAr: string; courseTitleEn: string };

interface OverviewCertificate {
  id: string;
  certificateCode: string;
  issueDate: string;
  courseTitleAr: string;
  courseTitleEn: string;
}

interface Overview {
  user: { fullName: string; email: string; createdAt: string };
  courses: OverviewCourse[];
  certificates: OverviewCertificate[];
  activity: ActivityItem[];
  stats: { active: number; completed: number; lessonsDone: number; certificates: number };
}

function StatSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5" aria-hidden="true">
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse mb-3" />
      <div className="h-7 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-3 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse mt-2" />
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (user?.role === "ADMIN") router.replace("/admin");
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/me/overview");
      if (!response.ok) throw new Error("overview failed");
      const data = (await response.json()) as Overview;
      setOverview(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  if (isAuthLoading) {
    return <SirajLoading />;
  }

  if (!isAuthenticated || user?.role === "ADMIN") {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("يرجى تسجيل الدخول", "Please sign in")}</h1>
        <Link href="/auth/login" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("تسجيل الدخول", "Sign In")}</Link>
      </div>
    );
  }

  const ForwardIcon = lang === "ar" ? ArrowLeft : ArrowRight;
  const stats = [
    { label: t("نشطة", "Active"), value: overview?.stats.active, icon: BookOpen },
    { label: t("مكتملة", "Completed"), value: overview?.stats.completed, icon: GraduationCap },
    { label: t("دروس", "Lessons"), value: overview?.stats.lessonsDone, icon: FileText },
    { label: t("شهادات", "Certificates"), value: overview?.stats.certificates, icon: Award },
  ];

  const courses = overview?.courses ?? [];
  const activeCourses = courses.filter((course) => course.status !== "completed");
  // Spotlight: most recently active course first (never invented data —
  // falls back to list order when nothing was completed yet).
  const spotlight =
    [...activeCourses].sort((a, b) => (b.lastActivityAt ?? "") < (a.lastActivityAt ?? "") ? -1 : 1)[0] ?? null;
  const latestCertificate = overview?.certificates[0] ?? null;
  const latestActivity = overview?.activity[0] ?? null;

  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {t("مرحبًا،", "Welcome,")} {user?.name?.split(" ")[0] || t("الطالب", "Student")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t("تابع رحلتك في طلب العلم", "Continue your journey of seeking knowledge")}</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                  <stat.icon size={20} />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value ?? 0}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid lg:grid-cols-3 gap-6" aria-hidden="true">
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 space-y-3">
              <div className="h-5 w-40 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-3 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-3 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: "60%" }} />
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 space-y-3">
              <div className="h-5 w-28 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-3 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
          </div>
        ) : loadError ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t("تعذر تحميل بيانات التعلم.", "Could not load your learning data.")}</p>
            <button type="button" onClick={() => void load()} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors duration-150">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <BookOpen size={26} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("لم تبدأ أي دورة بعد", "You have not started any course yet")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t("ابدأ رحلتك العلمية باختيار إحدى دورات سراج.", "Start your learning journey with one of Siraj's courses.")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <Link href="/courses" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors duration-150">
                {t("استكشف الدورات", "Explore courses")}
                <ForwardIcon size={15} />
              </Link>
              <Link href="/paths" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                {t("تصفح المسارات التعليمية", "Browse learning paths")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Continue learning hero */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
                {spotlight ? (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t("متابعة التعلم", "Continue learning")}</h2>
                    <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {t(spotlight.titleAr, spotlight.titleEn)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
                      {lang === "ar" ? (spotlight.instructorAr || spotlight.instructorEn) : (spotlight.instructorEn || spotlight.instructorAr)}
                    </p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full transition-all duration-200" style={{ width: `${spotlight.completion}%` }} />
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{spotlight.completion}%</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      {spotlight.doneLessons} {t("من", "of")} {spotlight.totalLessons} {t("درسًا", "lessons")}
                    </p>
                    {spotlight.lastCompletedLesson && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1 truncate">
                        {t("آخر درس مكتمل:", "Last completed lesson:")}{" "}
                        <span className="font-medium text-gray-900 dark:text-white">{t(spotlight.lastCompletedLesson.titleAr, spotlight.lastCompletedLesson.titleEn)}</span>
                      </p>
                    )}
                    {spotlight.nextLesson && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 truncate">
                        {t("الدرس التالي:", "Next lesson:")}{" "}
                        <span className="font-medium text-gray-900 dark:text-white">{t(spotlight.nextLesson.titleAr, spotlight.nextLesson.titleEn)}</span>
                      </p>
                    )}
                    <Link
                      href={`/courses/${spotlight.id}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors duration-150"
                    >
                      <PlayCircle size={16} />
                      {t("متابعة التعلم", "Continue learning")}
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("أحسنت، أكملت جميع دوراتك الحالية.", "Well done — you finished all your current courses.")}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t("واصل التقدم باستكشاف دورات جديدة.", "Keep going by exploring new courses.")}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/courses" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors duration-150">
                        {t("استكشف دورات جديدة", "Explore new courses")}
                        <ForwardIcon size={15} />
                      </Link>
                      <Link
                        href="/dashboard/certificates"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                      >
                        {t("عرض شهاداتي", "View my certificates")}
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Latest achievement */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t("آخر إنجاز", "Latest achievement")}</h2>
                {latestCertificate ? (
                  <>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                      <Award size={22} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("حصلت على شهادة", "You earned a certificate")}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">
                      {t(latestCertificate.courseTitleAr, latestCertificate.courseTitleEn)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">{new Date(latestCertificate.issueDate).toLocaleDateString("ar")}</p>
                    <Link
                      href={`/certificates/${latestCertificate.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors duration-150"
                    >
                      {t("عرض الشهادة", "View certificate")}
                    </Link>
                  </>
                ) : latestActivity ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {latestActivity.kind === "lesson" &&
                        t(`أكملت درس "${latestActivity.lessonTitleAr}"`, `Completed lesson "${latestActivity.lessonTitleEn}"`)}
                      {latestActivity.kind === "exam" &&
                        t(`قدّمت اختبار "${latestActivity.examTitleAr}"`, `Submitted exam "${latestActivity.examTitleEn}"`)}
                      {latestActivity.kind === "certificate" &&
                        t(`حصلت على شهادة "${latestActivity.courseTitleAr}"`, `Earned certificate "${latestActivity.courseTitleAr}"`)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(latestActivity.date).toLocaleDateString("ar")}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا إنجازات بعد — أكمل درسك الأول.", "No achievements yet — complete your first lesson.")}</p>
                )}
              </div>
            </div>

            {/* My courses */}
            {activeCourses.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("دوراتي", "My courses")}</h2>
                  <Link href="/courses" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                    {t("عرض الكل", "View all")}
                    <ForwardIcon size={14} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {activeCourses.map((course) => (
                    <div key={course.id} className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t(course.titleAr, course.titleEn)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {lang === "ar" ? (course.instructorAr || course.instructorEn) : (course.instructorEn || course.instructorAr)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${course.completion}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {course.doneLessons}/{course.totalLessons} · {course.completion}%
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/courses/${course.id}`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors duration-150"
                      >
                        {t("متابعة", "Continue")}
                        <ForwardIcon size={13} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates shortcut */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Award size={22} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">{t("شهاداتي", "My certificates")}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {overview?.stats.certificates ?? 0} {t("شهادة", "certificates")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/certificates"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  {t("عرض الشهادات", "View certificates")}
                  <ForwardIcon size={15} />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
