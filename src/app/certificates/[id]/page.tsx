"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { fetchCertificate, type CertificateDetail } from "@/lib/certificates-api";
import { Award, BadgeCheck, Calendar, Clock, Download, Printer } from "lucide-react";
import SirajLoading from "@/components/ui/SirajLoading";

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLang();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetchCertificate(id)
      .then((data) => {
        if (!data) setMissing(true);
        else setCertificate(data);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <SirajLoading />;
  }

  if (missing || !certificate) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("الشهادة غير موجودة", "Certificate not found")}</h1>
        <Link href="/dashboard/certificates" className="text-emerald-700 dark:text-emerald-400 hover:underline">
          {t("شهاداتي", "My certificates")}
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
          <img
            src={`/api/certificates/${certificate.id}/image`}
            alt={t("صورة الشهادة", "Certificate image")}
            className="w-full h-auto block"
          />
          <div className="relative bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-950/20 p-8 sm:p-12 text-center border-b border-emerald-100 dark:border-emerald-900/30">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-6">
              <Award size={30} className="text-white" />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t("منصة سراج", "Siraj Platform")}</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
              {t("شهادة إتمام", "Completion Certificate")}
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t("تُشهد بأن", "This certifies that")}</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{certificate.studentName}</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t("قد أتم بنجاح دورة", "has successfully completed the course")}</p>
            <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-6">
              {t(certificate.course.titleAr, certificate.course.titleEn)}
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              {certificate.finalScorePercentage !== null && (
                <span>{t("النتيجة", "Score")}: {certificate.finalScorePercentage}%</span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {t("المدة", "Duration")}: {certificate.durationText}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(certificate.issueDate).toLocaleDateString("ar")}
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={14} />
                {certificate.certificateCode}
              </span>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400" />
          </div>
          <div className="px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50">
            <Link
              href={`/verify?code=${encodeURIComponent(certificate.certificateCode)}`}
              className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {t("تحقق من صحة الشهادة", "Verify this certificate")}
            </Link>
            <div className="flex items-center gap-2">
              <a
                href={`/api/certificates/${certificate.id}/image`}
                download={`siraj-certificate-${certificate.certificateCode}.png`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Download size={14} />
                {t("تحميل الشهادة", "Download Certificate")}
              </a>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-colors"
              >
                <Printer size={14} />
                {t("طباعة", "Print")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
