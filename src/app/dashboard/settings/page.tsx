"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { User, Globe, Moon, Shield, LogOut, ChevronLeft } from "lucide-react";
import { useState } from "react";
import SirajLoading from "@/components/ui/SirajLoading";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";

export default function SettingsPage() {
  const { t, lang, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isAuthLoading, user, logout } = useAuth();
  const { dialog, notify } = useSirajMessage();

  const [name, setName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

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

  if (!nameLoaded && user?.name) {
    setName(user.name);
    setNameLoaded(true);
  }

  const handleSaveName = async () => {
    setNameSaving(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      notify(t("تم الحفظ بنجاح", "Saved successfully"), "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "failed", "error");
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      notify(t("تم التحديث بنجاح", "Updated successfully"), "success");
      setCurrentPw("");
      setNewPw("");
    } catch (e) {
      notify(e instanceof Error ? e.message : "failed", "error");
    } finally {
      setPwSaving(false);
    }
  };

  const sections = [
    {
      icon: <User size={18} />,
      title: t("معلومات الحساب", "Account Information"),
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("الاسم", "Name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("البريد الإلكتروني", "Email")}</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none opacity-60 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveName}
              disabled={nameSaving || !name.trim()}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {nameSaving ? t("جارٍ الحفظ...", "Saving...") : t("حفظ التغييرات", "Save Changes")}
            </button>
          </div>
        </div>
      ),
    },
    {
      icon: <Globe size={18} />,
      title: t("اللغة", "Language"),
      content: (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t("لغة الواجهة", "Interface Language")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("الحالية:", "Current:")} {lang === "ar" ? "العربية" : "English"}</p>
          </div>
          <button
            onClick={toggleLang}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>
      ),
    },
    {
      icon: <Moon size={18} />,
      title: t("المظهر", "Appearance"),
      content: (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t("الوضع الداكن", "Dark Mode")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("الحالي:", "Current:")} {theme === "dark" ? t("داكن", "Dark") : t("فاتح", "Light")}</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-emerald-600" : "bg-gray-300"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${theme === "dark" ? "start-6.5 translate-x-0" : "start-0.5"}`} />
          </button>
        </div>
      ),
    },
    {
      icon: <Shield size={18} />,
      title: t("الخصوصية والأمان", "Privacy & Security"),
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("كلمة المرور الحالية", "Current Password")}</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("كلمة المرور الجديدة", "New Password")}</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !currentPw || !newPw || newPw.length < 8}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {pwSaving ? t("جارٍ التحديث...", "Updating...") : t("تحديث كلمة المرور", "Update Password")}
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("لوحة التحكم", "Dashboard")}</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t("الإعدادات", "Settings")}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {t("الإعدادات", "Settings")}
        </h1>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  {section.icon}
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{section.title}</h2>
              </div>
              {section.content}
            </div>
          ))}

          {/* Danger Zone */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200/60 dark:border-red-900/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
                <LogOut size={18} />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{t("تسجيل الخروج", "Logout")}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("قم بتسجيل الخروج من حسابك على هذا الجهاز.", "Sign out of your account on this device.")}
            </p>
            <button
              onClick={logout}
              className="px-5 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl transition-colors border border-red-200 dark:border-red-900/30"
            >
              {t("تسجيل الخروج", "Sign Out")}
            </button>
          </div>
        </div>
      </div>
      <SirajDialog {...dialog} />
    </div>
  );
}
