"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Award, BookOpen, CircleCheck, ClipboardList, Film, GraduationCap, Mail, Plus, TrendingUp, Users } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import StatCard from "@/components/admin/StatCard";
import PageHeader from "@/components/admin/PageHeader";
import { CardSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import type { AdminAnalytics } from "@/lib/admin-analytics";

type DashCourse = { id: string; titleAr: string; createdAt?: string; lessons?: { id: string }[] };
type DashExam = { id: string; titleAr: string; courseTitleAr: string; createdAt?: string };
type DashUser = { id: string; fullName: string; role: string; createdAt?: string };
type DashCert = {
  id: string;
  certificateCode: string;
  issueDate: string;
  student: { fullName: string };
  course: { id: string; titleAr: string };
};
type DashMsg = { id: string; subject: string; name: string; createdAt: string; status: string };

type Activity = { key: string; text: string; date: string; href: string };

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [courses, setCourses] = useState<DashCourse[]>([]);
  const [exams, setExams] = useState<DashExam[]>([]);
  const [users, setUsers] = useState<DashUser[]>([]);
  const [certificates, setCertificates] = useState<DashCert[]>([]);
  const [messages, setMessages] = useState<DashMsg[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [coursesRes, examsRes, usersRes, certsRes, msgsRes] = await Promise.all([
        fetch("/api/admin/courses"),
        fetch("/api/admin/exams"),
        fetch("/api/admin/users"),
        fetch("/api/admin/certificates"),
        fetch("/api/admin/contact"),
      ]);
      if (!coursesRes.ok || !examsRes.ok || !usersRes.ok || !certsRes.ok || !msgsRes.ok) {
        throw new Error("load failed");
      }
      const coursesData = await coursesRes.json();
      const coursesList: DashCourse[] = Array.isArray(coursesData) ? coursesData : (coursesData.courses ?? []);
      setCourses(coursesList);
      setExams(await examsRes.json());
      setUsers(await usersRes.json());
      setCertificates(await certsRes.json());
      setMessages(await msgsRes.json());
    } catch {
      setLoadError(true);
      notify(t("تعذر تحميل بيانات اللوحة", "Could not load dashboard data"), "error");
    } finally {
      setLoading(false);
    }
  }, [t, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  // Analytics loads independently: its failure never blanks the dashboard.
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    try {
      const response = await fetch("/api/admin/analytics");
      if (!response.ok) throw new Error("analytics failed");
      setAnalytics((await response.json()) as AdminAnalytics);
    } catch {
      setAnalyticsError(true);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const adminName = (session?.user?.name ?? "").split(" ").slice(0, 2).join(" ");
  const students = users.filter((u) => u.role !== "ADMIN");
  const newMessages = messages.filter((m) => m.status === "new");
  const lessonsCount = courses.reduce((sum, c) => sum + (c.lessons?.length ?? 0), 0);
  const recentCourses = courses.slice(0, 5);

  const activity: Activity[] = [
    ...courses.slice(0, 3).map((c) => ({
      key: `course-${c.id}`,
      text: `${t("تم إنشاء دورة جديدة", "New course created")}: ${c.titleAr}`,
      date: c.createdAt ?? "",
      href: `/admin/courses/${c.id}`,
    })),
    ...exams.slice(0, 3).map((e) => ({
      key: `exam-${e.id}`,
      text: `${t("تم إنشاء اختبار", "Exam created")}: ${e.titleAr}`,
      date: e.createdAt ?? "",
      href: "/admin/exams",
    })),
    ...certificates.slice(0, 3).map((c) => ({
      key: `cert-${c.id}`,
      text: `${t("تم إصدار شهادة لـ", "Certificate issued to")} ${c.student.fullName}`,
      date: c.issueDate ?? "",
      href: "/admin/certificates",
    })),
    ...messages.slice(0, 3).map((m) => ({
      key: `msg-${m.id}`,
      text: `${t("رسالة جديدة من", "New message from")} ${m.name}`,
      date: m.createdAt ?? "",
      href: "/admin/contact",
    })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title={t(`مرحبًا، ${adminName}`, `Welcome, ${adminName}`)}
        subtitle={t("إليك نظرة سريعة على منصة سراج", "A quick overview of the Siraj platform")}
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل البيانات.", "Could not load data.")}</p>
          <button type="button" onClick={() => void load()} className="admin-button w-auto px-6">
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title={t("الطلاب", "Students")} value={students.length} icon={Users} href="/admin/users" />
            <StatCard title={t("الدورات", "Courses")} value={courses.length} icon={BookOpen} href="/admin/courses" />
            <StatCard title={t("الدروس", "Lessons")} value={lessonsCount} icon={Film} href="/admin/courses" />
            <StatCard title={t("الاختبارات", "Exams")} value={exams.length} icon={GraduationCap} href="/admin/exams" />
            <StatCard title={t("الشهادات", "Certificates")} value={certificates.length} icon={Award} href="/admin/certificates" />
            <StatCard
              title={t("رسائل جديدة", "New messages")}
              value={newMessages.length}
              icon={Mail}
              hint={t(`من أصل ${messages.length}`, `of ${messages.length}`)}
              href="/admin/contact"
            />
          </div>

          <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("إجراءات سريعة", "Quick actions")}</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/courses" className="admin-button w-auto px-5">
                <Plus size={16} />
                {t("إضافة دورة", "Add course")}
              </Link>
              <Link
                href="/admin/exams"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
              >
                <Plus size={16} />
                {t("إضافة اختبار", "Add exam")}
              </Link>
              <Link
                href="/admin/library"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
              >
                <Plus size={16} />
                {t("إضافة كتاب", "Add book")}
              </Link>
            </div>
          </div>

          <div className="mt-6 grid lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">{t("آخر الدورات", "Latest courses")}</h2>
                <Link href="/admin/courses" className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                  {t("عرض الكل", "View all")}
                </Link>
              </div>
              {recentCourses.length > 0 ? (
                <div className="space-y-2">
                  {recentCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/admin/courses/${course.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <span className="text-sm text-gray-900 dark:text-white truncate">{course.titleAr}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        {course.lessons?.length ?? 0} {t("دروس", "lessons")}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد دورات بعد.", "No courses yet.")}</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("النشاط الأخير", "Recent activity")}</h2>
              {activity.length > 0 ? (
                <div className="space-y-2">
                  {activity.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.text}</span>
                      <span className="text-xs text-gray-400 shrink-0">{new Date(item.date).toLocaleDateString("ar")}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا يوجد نشاط بعد.", "No activity yet.")}</p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t("تحليلات التعلم", "Learning analytics")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t("أرقام حقيقية من بيانات المنصة فقط — بلا تتبع خارجي.", "Real platform data only — no external tracking.")}
            </p>
            {analyticsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CardSkeleton key={i} lines={3} />
                ))}
              </div>
            ) : analyticsError || !analytics ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل التحليلات.", "Could not load analytics.")}</p>
                <button type="button" onClick={() => void loadAnalytics()} className="admin-button w-auto px-6">
                  {t("إعادة المحاولة", "Retry")}
                </button>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title={t("إكمالات الدروس", "Lesson completions")} value={analytics.learning.completions} icon={ClipboardList} />
                  <StatCard title={t("محاولات الاختبارات", "Exam attempts")} value={analytics.learning.attempts} icon={GraduationCap} href="/admin/exams" />
                  <StatCard
                    title={t("نسبة النجاح", "Pass rate")}
                    value={analytics.learning.passed + analytics.learning.failed > 0 ? `${Math.round((analytics.learning.passed / (analytics.learning.passed + analytics.learning.failed)) * 100)}%` : "—"}
                    icon={CircleCheck}
                    hint={t(`${analytics.learning.passed} ناجحة · ${analytics.learning.failed} راسبة`, `${analytics.learning.passed} passed · ${analytics.learning.failed} failed`)}
                  />
                  <StatCard
                    title={t("متوسط الدرجات", "Average score")}
                    value={analytics.learning.avgScore !== null ? `${analytics.learning.avgScore}%` : "—"}
                    icon={TrendingUp}
                  />
                </div>

                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t("هذا الأسبوع", "This week")}</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: t("مستخدمون جدد", "New users"), value: analytics.users.newThisWeek },
                      { label: t("شهادات", "Certificates"), value: analytics.learning.certsThisWeek },
                      { label: t("إكمالات", "Completions"), value: analytics.learning.completionsThisWeek },
                      { label: t("محاولات", "Attempts"), value: analytics.learning.attemptsThisWeek },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t("الدورات الأكثر نشاطًا", "Most active courses")}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t("الأكثر من حيث إكمال الدروس", "Ranked by lesson completions")}</p>
                    {analytics.courses.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.courses.slice(0, 5).map((course) => {
                          const max = analytics.courses[0]?.completions ?? 0;
                          return (
                            <Link key={course.id} href={`/admin/courses/${course.id}`} className="block group">
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span className="text-sm text-gray-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{course.titleAr}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                  {course.completions} {t("إكمال", "completions")} · {course.enrollments} {t("مسجل", "enrolled")}
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full transition-all duration-200"
                                  style={{ width: `${max > 0 ? Math.round((course.completions / max) * 100) : 0}%` }}
                                />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد دورات بعد.", "No courses yet.")}</p>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t("أكثر الدروس إكمالًا", "Most completed lessons")}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t("المحتوى الذي يستهلكه الطلاب فعليًا", "Content students actually consume")}</p>
                    {analytics.topLessons.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.topLessons.map((lesson, index) => (
                          <Link
                            key={lesson.id}
                            href={lesson.courseId ? `/admin/courses/${lesson.courseId}` : "/admin/courses"}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                          >
                            <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-gray-900 dark:text-white truncate">{lesson.titleAr}</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{lesson.courseTitleAr}</span>
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                              {lesson.completions} {t("إكمال", "completions")}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد إكمالات بعد.", "No completions yet.")}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t("آخر النشاطات", "Latest activity")}</h3>
                  {analytics.activity.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.activity.map((item, index) => (
                        <Link
                          key={`${item.kind}-${item.date}-${index}`}
                          href={item.href}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                        >
                          <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0">
                            {item.kind === "lesson" ? t("درس", "Lesson") : item.kind === "exam" ? t("اختبار", "Exam") : t("شهادة", "Certificate")}
                          </span>
                          <span className="min-w-0 flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                            {item.studentName}
                            {item.kind === "lesson" && item.lessonTitleAr ? ` · ${item.lessonTitleAr}` : ""}
                            {item.kind === "exam" && item.examTitleAr ? ` · ${item.examTitleAr}` : ""}
                            {item.kind === "certificate" && item.courseTitleAr ? ` · ${item.courseTitleAr}` : ""}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">{new Date(item.date).toLocaleDateString("ar")}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا يوجد نشاط بعد.", "No activity yet.")}</p>
                  )}
                </div>

                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t("أحدث الشهادات", "Latest certificates")}</h3>
                  {analytics.recentCertificates.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.recentCertificates.map((cert) => (
                        <div key={cert.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                          <div className="min-w-0">
                            <span className="block text-gray-900 dark:text-white truncate">
                              {cert.studentName} · {cert.courseTitleAr}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {cert.certificateCode} · {new Date(cert.issueDate).toLocaleDateString("ar")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد شهادات صادرة بعد.", "No certificates issued yet.")}</p>
                  )}
                </div>
              </>
            )}
          </div>

        </>
      )}
      <SirajDialog {...dialog} />
    </div>
  );
}
