"use client";

import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const { t } = useLang();
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError(t("يرجى ملء جميع الحقول", "Please fill in all fields"));
      return;
    }
    if (password.length < 8) {
      setError(t("كلمة المرور يجب أن تكون 8 أحرف على الأقل", "Password must be at least 8 characters"));
      return;
    }
    const success = await register(name, email, password);
    if (success) {
      router.push("/auth/login?registered=1");
    } else {
      setError(t("تعذر إنشاء الحساب أو البريد مستخدم مسبقًا", "Could not create account or email is already in use"));
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4">
            <img
              src="/siraj-logo.png"
              alt={t("سراج", "SIRAJ")}
              width={1254}
              height={1254}
              className="h-12 sm:h-14 w-auto object-contain shrink-0"
            />
            <img
              src="/siraj-wordmark.png"
              alt=""
              width={2048}
              height={2048}
              className="h-16 sm:h-[4.5rem] aspect-[1284/742] w-auto object-cover object-center shrink-0"
            />
            <img
              src="/siraj-logo.png"
              alt=""
              width={1254}
              height={1254}
              className="h-12 sm:h-14 w-auto object-contain shrink-0"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("إنشاء حساب", "Create Account")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("انضم إلى أكاديمية سراج وابدأ رحلة التعلم", "Join SIRAJ Academy and start your learning journey")}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("الاسم الكامل", "Full Name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                placeholder={t("أحمد محمد", "Ahmed Mohammed")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("البريد الإلكتروني", "Email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("كلمة المرور", "Password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full px-4 py-2.5 pe-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" required className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500" />
              <span>
                {t("أوافق على ", "I agree to the ")}
                <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("الشروط والأحكام", "Terms of Service")}</Link>
                {t(" و ", " and ")}
                <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("سياسة الخصوصية", "Privacy Policy")}</Link>
              </span>
            </label>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              <UserPlus size={16} />
              {t("إنشاء حساب", "Create Account")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {t("لديك حساب بالفعل؟", "Already have an account?")}{" "}
          <Link href="/auth/login" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            {t("سجل الدخول", "Sign in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
