"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Search, Sun, Moon, User, LogOut, ShieldCheck } from "lucide-react";
import SirajTooltip from "@/components/ui/SirajTooltip";
import { searchCourses } from "@/lib/courses-api";

export default function Navbar() {
  const { lang, toggleLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [courseSug, setCourseSug] = useState<{ items: { id: string; title: string; titleEn: string }[]; total: number }>({ items: [], total: 0 });
  const [libSug, setLibSug] = useState<{ items: { id: string; titleAr: string; titleEn: string }[]; total: number }>({ items: [], total: 0 });

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  // Unified server-side suggestions: debounced (300ms), stale requests
  // aborted, real totals for honest counts.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!searchOpen || q.length < 2) {
      setCourseSug({ items: [], total: 0 });
      setLibSug({ items: [], total: 0 });
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [courseSug, libraryRes] = await Promise.all([
            searchCourses({ q, take: 6, signal: controller.signal }),
            fetch(`/api/library?q=${encodeURIComponent(q)}&take=6`, { signal: controller.signal }),
          ]);
          if (controller.signal.aborted) return;
          const libraryData: unknown = libraryRes.ok ? await libraryRes.json().catch(() => null) : null;
          const courseItems = courseSug.items;
          const courseTotal = courseSug.total;
          const libItems =
            typeof libraryData === "object" && libraryData !== null && Array.isArray((libraryData as { items?: unknown }).items)
              ? ((libraryData as { items: unknown }).items as { id: string; titleAr: string; titleEn: string }[])
              : [];
          const libTotal =
            typeof libraryData === "object" && libraryData !== null && typeof (libraryData as { total?: unknown }).total === "number"
              ? ((libraryData as { total: number }).total)
              : libItems.length;
          setCourseSug({ items: courseItems.slice(0, 5), total: courseTotal });
          setLibSug({ items: libItems.slice(0, 5), total: libTotal });
        } catch {
          // Aborted or failed: keep previous suggestions, never crash.
        } finally {
          if (!controller.signal.aborted) setSearching(false);
        }
      })();
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);

  const navLinks = [
    { href: "/", label: t("الرئيسية", "Home") },
    { href: "/courses", label: t("الدورات", "Courses") },
    { href: "/paths", label: t("المسارات", "Paths") },
    { href: "/library", label: t("المكتبة", "Library") },
    { href: "/about", label: t("عن سراج", "About") },
    { href: "/contact", label: t("اتصل بنا", "Contact") },
  ];

  const trimmedQuery = searchQuery.trim();
  const queryActive = trimmedQuery.length > 1;
  const courseResults = courseSug.items.map((c) => ({ type: t("دورة", "Course"), title: t(c.title, c.titleEn), href: `/courses/${c.id}` }));
  const libraryResults = libSug.items.map((item) => ({ type: t("مكتبة", "Library"), title: t(item.titleAr, item.titleEn), href: `/library/${item.id}` }));
  const hasResults = courseResults.length > 0 || libraryResults.length > 0;

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-300/70 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1 sm:gap-1.5 shrink-0" aria-label={t("سراج", "SIRAJ")}>
              <img
                src="/siraj-logo.png"
                alt={t("سراج", "SIRAJ")}
                width={1254}
                height={1254}
                className="h-7 sm:h-9 min-[1200px]:h-10 w-auto object-contain shrink-0"
              />
              <img
                src="/siraj-wordmark.png"
                alt=""
                width={2048}
                height={2048}
                className="hidden min-[360px]:block h-10 sm:h-12 min-[1200px]:h-14 aspect-[1284/742] w-auto object-cover object-center shrink-0"
              />
              <img
                src="/siraj-logo.png"
                alt=""
                width={1254}
                height={1254}
                className="h-7 sm:h-9 min-[1200px]:h-10 w-auto object-contain shrink-0"
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
              <SirajTooltip label={t("البحث في الدورات والمكتبة", "Search courses and library")} side="bottom">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={t("بحث", "Search")}
                >
                  <Search size={18} />
                </button>
              </SirajTooltip>

              {/* Language */}
              <SirajTooltip label={t("تبديل لغة الواجهة", "Switch interface language")} side="bottom">
                <button
                  onClick={toggleLang}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {lang === "ar" ? "EN" : "عر"}
                </button>
              </SirajTooltip>

              {/* Theme */}
              <SirajTooltip label={t("التبديل بين الوضع الفاتح والداكن", "Switch between light and dark mode")} side="bottom">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={t("تغيير السمة", "Toggle theme")}
                >
                  {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              </SirajTooltip>

              {/* Auth */}
              {isAuthenticated ? (
                <div
                  className="relative"
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && userMenuOpen) {
                      setUserMenuOpen(false);
                      userMenuButtonRef.current?.focus();
                    }
                  }}
                >
                  <SirajTooltip label={t("قائمة الحساب", "Account menu")} side="bottom">
                    <button
                      ref={userMenuButtonRef}
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      aria-expanded={userMenuOpen}
                      aria-controls="navbar-user-menu"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <User size={14} className="text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-24 truncate">
                        {user?.name?.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </button>
                  </SirajTooltip>
                  {userMenuOpen && (
                    <div id="navbar-user-menu" role="menu" className="absolute top-full mt-2 end-0 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-2 z-50">
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
              <SirajTooltip label={t("فتح/إغلاق القائمة", "Open or close the menu")} side="bottom">
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-expanded={mobileOpen}
                  aria-controls="navbar-mobile-menu"
                  className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={t("القائمة", "Menu")}
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </SirajTooltip>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div
            id="navbar-mobile-menu"
            className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
            onKeyDown={(e) => {
              if (e.key === "Escape") setMobileOpen(false);
            }}
          >
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
                  aria-label={t("ابحث عن دورات، كتب، مقالات...", "Search courses, books, articles...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeSearch();
                    if (e.key === "Enter" && searchQuery.trim().length > 1) {
                      const q = searchQuery.trim();
                      closeSearch();
                      router.push(`/search?q=${encodeURIComponent(q)}`);
                    }
                  }}
                  placeholder={t("ابحث عن دورات، كتب، مقالات...", "Search courses, books, articles...")}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
                />
                <SirajTooltip label={t("إغلاق البحث", "Close search")} side="bottom">
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X size={18} />
                  </button>
                </SirajTooltip>
              </div>
              {queryActive && searching && (
                <div className="px-5 py-6 space-y-2" aria-hidden="true">
                  {[90, 70, 80].map((w, i) => (
                    <div key={i} className="h-4 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}
              {queryActive && !searching && hasResults && (
                <div className="max-h-80 overflow-y-auto py-2">
                  {courseResults.length > 0 && (
                    <div>
                      <p className="px-5 pt-1 pb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500">
                        {t("الدورات", "Courses")} ({courseSug.total})
                      </p>
                      {courseResults.map((result) => (
                        <Link
                          key={result.href}
                          href={result.href}
                          onClick={closeSearch}
                          className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded shrink-0">
                            {result.type}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{result.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {libraryResults.length > 0 && (
                    <div>
                      <p className="px-5 pt-1 pb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500">
                        {t("المكتبة", "Library")} ({libSug.total})
                      </p>
                      {libraryResults.map((result) => (
                        <Link
                          key={result.href}
                          href={result.href}
                          onClick={closeSearch}
                          className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded shrink-0">
                            {result.type}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{result.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
                    onClick={closeSearch}
                    className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    {t("عرض جميع النتائج", "View all results")}
                    <span aria-hidden="true" className="rtl:rotate-180">→</span>
                  </Link>
                </div>
              )}
              {queryActive && !searching && !hasResults && (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {t("لم يتم العثور على نتائج", "No results found")}
                  </p>
                  <Link
                    href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
                    onClick={closeSearch}
                    className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {t("عرض جميع النتائج", "View all results")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
