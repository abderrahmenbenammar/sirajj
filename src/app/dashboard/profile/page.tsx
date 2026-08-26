"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { courses, studentData } from "@/lib/mock-data";
import { User, Mail, Calendar, BookOpen, Award, Clock, ArrowLeft, ArrowRight } from "lucide-react";

export default function ProfilePage() {
  const { t, lang } = useLang();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("يرجى تسجيل الدخول", "Please sign in")}</h1>
        <Link href="/auth/login" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("تسجيل الدخول", "Sign In")}</Link>
      </div>
    );
  }

  const completedCourses = courses.filter((c) => studentData.completedCourses.includes(c.id));
  const stats = studentData.stats;

  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("لوحة التحكم", "Dashboard")}</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t("الملف الشخصي", "Profile")}</span>
        </div>

        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shrink-0">
              <User size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {user?.name || studentData.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{user?.email || studentData.email}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Calendar size={12} />
                {t("عضو منذ", "Member since")} {studentData.joinDate}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: <BookOpen size={18} />, value: stats.completedCourses, label: t("مكتملة", "Completed") },
            { icon: <Clock size={18} />, value: `${stats.totalHoursLearned}h`, label: t("ساعات", "Hours") },
            { icon: <Award size={18} />, value: stats.averageGrade, label: t("المعدل", "Average") },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-5 text-center">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2">
                {s.icon}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Course History */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{t("سجل الدورات", "Course History")}</h2>
          <div className="space-y-3">
            {courses.filter((c) => c.progress && c.progress > 0).map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {t(course.title, course.titleEn)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${course.progress}%` }} />
                    </div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{course.progress}%</span>
                  </div>
                </div>
                {studentData.completedCourses.includes(course.id) ? (
                  <span className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">{t("مكتمل", "Done")}</span>
                ) : (
                  <ArrowLeft size={14} className="text-gray-400" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
