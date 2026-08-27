"use client";

import { useLang } from "@/lib/lang-context";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>س</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("نسيت كلمة المرور؟", "Forgot Password?")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t(
              "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور",
              "Enter your email and we'll send you a password reset link"
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("البريد الإلكتروني", "Email")}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full ps-10 pe-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                {t("إرسال رابط إعادة التعيين", "Send Reset Link")}
                {lang === "ar" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t("تم الإرسال بنجاح", "Email Sent Successfully")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t(
                  `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}. يرجى التحقق من بريدك.`,
                  `A password reset link has been sent to ${email}. Please check your email.`
                )}
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {t("إعادة الإرسال", "Resend")}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          <Link href="/auth/login" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1">
            {lang === "ar" ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            {t("العودة لتسجيل الدخول", "Back to Sign In")}
          </Link>
        </p>
      </div>
    </div>
  );
}
