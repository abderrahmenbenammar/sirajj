"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Award,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LibraryBig,
  Mail,
  Menu,
  Send,
  Settings,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/lib/lang-context";
import SirajLoading from "@/components/ui/SirajLoading";

type NavItem = { href: string; ar: string; en: string; icon: LucideIcon };
type NavBlock = { labelAr: string | null; labelEn: string | null; items: NavItem[] };

const NAV: NavBlock[] = [
  { labelAr: null, labelEn: null, items: [{ href: "/admin", ar: "الرئيسية", en: "Home", icon: LayoutDashboard }] },
  {
    labelAr: "المحتوى",
    labelEn: "Content",
    items: [
      { href: "/admin/courses", ar: "الدورات", en: "Courses", icon: BookOpen },
      { href: "/admin/exams", ar: "الاختبارات", en: "Exams", icon: GraduationCap },
      { href: "/admin/categories", ar: "التصنيفات", en: "Categories", icon: Tags },
      { href: "/admin/library", ar: "المكتبة", en: "Library", icon: LibraryBig },
    ],
  },
  {
    labelAr: null,
    labelEn: null,
    items: [
      { href: "/admin/users", ar: "المستخدمون", en: "Users", icon: Users },
      { href: "/admin/certificates", ar: "الشهادات", en: "Certificates", icon: Award },
    ],
  },
  {
    labelAr: "التواصل",
    labelEn: "Contact",
    items: [
      { href: "/admin/contact", ar: "الرسائل", en: "Messages", icon: Mail },
      { href: "/admin/newsletter", ar: "النشرة البريدية", en: "Newsletter", icon: Send },
      { href: "/admin/faqs", ar: "الأسئلة الشائعة", en: "FAQs", icon: HelpCircle },
    ],
  },
  {
    labelAr: null,
    labelEn: null,
    items: [{ href: "/admin/settings", ar: "الإعدادات", en: "Settings", icon: Settings }],
  },
];

function pageTitle(pathname: string, t: (ar: string, en: string) => string): string {
  if (pathname === "/admin") return t("الرئيسية", "Home");
  if (pathname === "/admin/courses") return t("الدورات", "Courses");
  if (pathname.startsWith("/admin/courses/")) return t("تعديل الدورة", "Edit course");
  if (pathname === "/admin/exams") return t("الاختبارات", "Exams");
  if (pathname === "/admin/users") return t("المستخدمون", "Users");
  if (pathname === "/admin/certificates") return t("الشهادات", "Certificates");
  if (pathname === "/admin/library") return t("المكتبة", "Library");
  if (pathname === "/admin/categories") return t("التصنيفات", "Categories");
  if (pathname === "/admin/contact") return t("الرسائل", "Messages");
  if (pathname === "/admin/newsletter") return t("النشرة البريدية", "Newsletter");
  if (pathname === "/admin/faqs") return t("الأسئلة الشائعة", "FAQs");
  if (pathname === "/admin/settings") return t("الإعدادات", "Settings");
  return t("لوحة الإدارة", "Admin");
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("siraj-admin-sidebar") === "collapsed") setCollapsed(true);
    } catch {
      /* storage unavailable — keep expanded */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem("siraj-admin-sidebar", current ? "expanded" : "collapsed");
      } catch {
        /* ignore */
      }
      return !current;
    });
  };

  // Same protection as before: ADMIN sees everything, anyone else is sent away.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login?admin=1");
    if (session?.user?.role !== "ADMIN") router.replace("/");
  }, [status, session, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <SirajLoading />
      </div>
    );
  }
  if (session?.user?.role !== "ADMIN") return null;

  const adminName = session.user.name ?? session.user.email ?? "";
  const adminInitial = (adminName.trim().charAt(0) || "م").toUpperCase();

  const sidebarBody = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2.5 px-4 pt-5 pb-4 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
        <Link href="/admin" className="flex items-center gap-2.5 min-w-0" aria-label={t("لوحة الإدارة", "Admin")}>
          <span className="shrink-0 w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">
            س
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 dark:text-white leading-tight">{t("سراج", "Siraj")}</span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{t("لوحة الإدارة", "Admin panel")}</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4" aria-label={t("تنقل الإدارة", "Admin navigation")}>
        {NAV.map((block, bi) => (
          <div key={bi}>
            {block.labelAr && !collapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">{t(block.labelAr, block.labelEn ?? "")}</p>
            )}
            <ul className="space-y-1">
              {block.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={t(item.ar, item.en)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                        collapsed ? "lg:justify-center" : ""
                      } ${
                        active
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="truncate">{t(item.ar, item.en)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="hidden lg:flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          aria-label={t("طي القائمة", "Collapse menu")}
        >
          {collapsed ? <ChevronsRight size={16} className="rtl:rotate-180" /> : <ChevronsLeft size={16} className="rtl:rotate-180" />}
          {!collapsed && <span>{t("تصغير", "Collapse")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Desktop sidebar (inline-start = right in RTL) */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 start-0 z-40 bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 transition-[width] duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("قائمة الإدارة", "Admin menu")}
          id="admin-mobile-drawer"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setMobileOpen(false);
              menuButtonRef.current?.focus();
            }
          }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={t("إغلاق", "Close")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)]">{sidebarBody}</div>
          </aside>
        </div>
      )}

      <div className={`transition-[margin] duration-200 ${collapsed ? "lg:ms-20" : "lg:ms-64"}`}>
        <header className="sticky top-0 z-30 bg-white/85 dark:bg-gray-950/85 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                ref={menuButtonRef}
                onClick={() => setMobileOpen(true)}
                aria-expanded={mobileOpen}
                aria-controls="admin-mobile-drawer"
                className="lg:hidden p-2 -ms-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={t("فتح القائمة", "Open menu")}
              >
                <Menu size={20} />
              </button>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {pageTitle(pathname, t)}
              </h1>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-40 truncate">
                {adminName}
              </span>
              <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold" aria-hidden="true">
                {adminInitial}
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
