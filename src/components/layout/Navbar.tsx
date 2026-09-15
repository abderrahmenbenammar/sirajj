"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { Menu, X, Search, Sun, Moon, User, LogOut, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { lang, toggleLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiCourses, setApiCourses] = useState<{ id: string; title: string; titleEn: string }[]>([]);
  const [apiLibrary, setApiLibrary] = useState<{ id: string; titleAr: string; titleEn: string; type: string }[]>([]);

  // Real data for search suggestions (PostgreSQL via public APIs).
  useEffect(() => {
    if (!searchOpen) return;
    if (apiCourses.length === 0) {
      fetch("/api/courses")
        .then((response) => (response.ok ? response.json() : []))
        .then((data: unknown) => {
          if (Array.isArray(data)) setApiCourses(data as { id: string; title: string; titleEn: string }[]);
        })
        .catch(() => undefined);
    }
    fetch("/api/library?take=5")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        const items =
          typeof data === "object" && data !== null && Array.isArray((data as { items?: unknown }).items)
            ? ((data as { items: unknown }).items as { id: string; titleAr: string; titleEn: string; type: string }[])
            : [];
        setApiLibrary(items);
      })
      .catch(() => undefined);
  }, [searchOpen, apiCourses.length]);

  const navLinks = [
    { href: "/", label: t("الرئيسية", "Home") },
    { href: "/courses", label: t("الدورات", "Courses") },
    { href: "/paths", label: t("المسارات", "Paths") },
    { href: "/library", label: t("المكتبة", "Library") },
    { href: "/about", label: t("عن سراج", "About") },
    { href: "/contact", label: t("اتصل بنا", "Contact") },
  ];

  const courseResults = searchQuery.length > 1 ? apiCourses
    .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.titleEn.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5)
    .map((c) => ({ type: t("دورة", "Course"), title: t(c.title, c.titleEn), href: `/courses/${c.id}` })) : [];

  const libraryResults = searchQuery.length > 1 ? apiLibrary
    .filter((item) => item.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) || item.titleEn.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5)
    .map((item) => ({ type: t("مكتبة", "Library"), title: t(item.titleAr, item.titleEn), href: `/library/${item.id}` })) : [];

  const searchResults = [...courseResults, ...libraryResults].filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-300/70 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label={t("سراج", "SIRAJ")}>
              <img
                src="/siraj-logo.png"
                alt={t("سراج", "SIRAJ")}
                width={1254}
                height={1254}
                className="h-9 w-auto object-contain dark:drop-shadow-[0_0_2px_rgb(255_255_255/0.35)]"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === link.href
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t("بحث", "Search")}
              >
                <Search size={18} />
              </button>

              {/* Language */}
              <button
                onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
              >
                {lang === "ar" ? "EN" : "عر"}
              </button>

              {/* Theme */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t("تغيير السمة", "Toggle theme")}
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {/* Auth */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <User size={14} className="text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-24 truncate">
                      {user?.name?.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute top-full mt-2 end-0 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-2 z-50">
                      {user?.role === "ADMIN" && (
                        <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => setUserMenuOpen(false)}>
                          <ShieldCheck size={15} />
                          {t("لوحة الإدارة", "Admin Panel")}
                        </Link>
                      )}
                      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setUserMenuOpen(false)}>
                        <User size={15} />
                        {t("لوحة التحكم", "Dashboard")}
                      </Link>
                      <Link href="/dashboard/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setUserMenuOpen(false)}>
                        <User size={15} />
                        {t("الملف الشخصي", "Profile")}
                      </Link>
                      <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setUserMenuOpen(false)}>
                        <User size={15} />
                        {t("الإعدادات", "Settings")}
                      </Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <LogOut size={15} />
                        {t("تسجيل الخروج", "Logout")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {t("ابدأ رحلة التعلم", "Start Learning")}
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t("القائمة", "Menu")}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-lg text-sm font-medium text-center bg-emerald-700 text-white mt-2"
                >
                  {t("ابدأ رحلة التعلم", "Start Learning")}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
          <div className="max-w-lg mx-auto mt-24 px-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("ابحث عن دورات، كتب، مقالات...", "Search courses, books, articles...")}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={18} />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-80 overflow-y-auto py-2">
                  {searchResults.map((result, i) => (
                    <Link
                      key={i}
                      href={result.href}
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                        {result.type}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{result.title}</span>
                    </Link>
                  ))}
                </div>
              )}
              {searchQuery.length > 1 && searchResults.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t("لم يتم العثور على نتائج", "No results found")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
