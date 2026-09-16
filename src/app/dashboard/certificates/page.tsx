"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Award, Calendar, User, ArrowLeft, BadgeCheck } from "lucide-react";
import SirajLoading from "@/components/ui/SirajLoading";

interface CertificateItem {
  id: string;
  certificateCode: string;
  issueDate: string;
  pdfUrl: string | null;
  courseTitleAr: string;
  courseTitleEn: string;
}

export default function CertificatesPage() {
  const { t } = useLang();
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/me/overview")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: { fullName?: string }; certificates?: CertificateItem[] } | null) => {
        if (!data) return;
        setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
        if (data.user?.fullName) setStudentName(data.user.fullName);
      })
      .catch(() => undefined);
  }, [isAuthenticated]);

  if (isAuthLoading) {
    return <SirajLoading />;
  }

  if (!isAuthenticated) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("يرجى تسجيل الدخول", "Please sign in")}</h1>
        <Link href="/auth/login" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("تسجيل الدخول", "Sign In")}</Link>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("لوحة التحكم", "Dashboard")}</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t("الشهادات", "Certificates")}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t("شهاداتي", "My Certificates")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10">
          {t("شهادات إتمام الدورات التي حصلت عليها", "Course completion certificates you have earned")}
        </p>

        {certificates.length > 0 ? (
          <div className="space-y-6">
            {certificates.map((cert) => (
              <div key={cert.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
                {/* Certificate Card */}
                <div className="relative bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-950/20 p-8 sm:p-10 border-b border-emerald-100 dark:border-emerald-900/30">
                  <div className="absolute top-4 end-4 opacity-10">
                    <Award size={80} className="text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                        <Award size={20} className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("شهادة إتمام", "Completion Certificate")}</span>
                    </div>

                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t("تُشهد بأن", "This certifies that")}</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                      {studentName || user?.name || ""}
                    </h2>

                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t("قد أتم بنجاح دورة", "has successfully completed the course")}</p>
                    <h3 className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-6">
                      {t(cert.courseTitleAr, cert.courseTitleEn)}
                    </h3>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <User size={14} />
                        {t("سراج", "Siraj")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(cert.issueDate).toLocaleDateString("ar")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BadgeCheck size={14} />
                        {cert.certificateCode}
                      </span>
                    </div>
                  </div>

                  {/* Decorative border */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400" />
                </div>

                {/* Actions */}
                <div className="px-8 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-xs text-gray-400">
                    {t("رمز التحقق", "Verification code")}: {cert.certificateCode}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/certificates/${cert.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-colors"
                    >
                      {t("عرض الشهادة", "View certificate")}
                    </Link>
                    {cert.pdfUrl ? (
                    <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors">
                      {t("تحميل الشهادة", "Download Certificate")}
                    </a>
                  ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
            <Award size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t("لا توجد شهادات بعد", "No certificates yet")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("أتمم دوراتك لتحصل على شهادات إتمام", "Complete your courses to earn completion certificates")}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {t("استكشف الدورات", "Explore Courses")}
              <ArrowLeft size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
