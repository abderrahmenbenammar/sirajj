"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useLang } from "@/lib/lang-context";

function ResetPasswordForm() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error ?? t("تعذر تغيير كلمة المرور", "Could not reset password"));
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/auth/login"), 1500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center mx-auto mb-4"><LockKeyhole className="text-white" /></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("إعادة تعيين كلمة المرور", "Reset Password")}</h1>
        </div>
        {done ? (
          <p className="text-center text-emerald-600 dark:text-emerald-400">{t("تم تغيير كلمة المرور. سيتم تحويلك لتسجيل الدخول.", "Password changed. Redirecting to sign in.")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 text-sm">{error}</p>}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("كلمة المرور الجديدة", "New password")}
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" />
            </label>
            <button type="submit" disabled={!token} className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-50">{t("حفظ كلمة المرور", "Save password")}</button>
            <Link href="/auth/login" className="block text-center text-sm text-emerald-600 hover:underline">{t("العودة لتسجيل الدخول", "Back to sign in")}</Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
