"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import { verifyCertificate, type Verification } from "@/lib/certificates-api";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Suspense } from "react";

function VerifyForm() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [result, setResult] = useState<Verification | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      setResult(await verifyCertificate(code));
    } catch {
      setError(t("تعذر التحقق، حاول مجددًا", "Verification failed, try again"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
          {t("التحقق من الشهادات", "Verify Certificates")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
          {t("أدخل رقم الشهادة للتأكد من صحتها", "Enter the certificate code to verify it")}
        </p>
        <form onSubmit={submit} className="flex gap-2 mb-8">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SIRAJ-2026-XXXXXXXX"
            dir="ltr"
            className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            disabled={busy}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {t("تحقق", "Verify")}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4">{error}</p>}
        {result && (
          result.valid ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-6 text-center">
              <BadgeCheck size={40} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-4">{t("✓ شهادة صحيحة", "✓ Valid certificate")}</p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-900 dark:text-white font-semibold">{result.studentName}</p>
                <p className="text-gray-600 dark:text-gray-400">{t(result.courseTitleAr ?? "", result.courseTitleEn ?? "")}</p>
                <p className="text-xs text-gray-400">{result.certificateCode} · {result.issueDate ? new Date(result.issueDate).toLocaleDateString("ar") : ""}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center">
              <ShieldAlert size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="font-bold text-gray-900 dark:text-white">{t("شهادة غير موجودة أو غير صالحة", "Certificate not found or invalid")}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
