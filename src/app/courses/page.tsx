"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import CourseCard from "@/components/courses/CourseCard";
import { searchCourses, type CourseCardData } from "@/lib/courses-api";
import { COURSE_PATHS, COURSE_PATH_LABELS } from "@/lib/course-paths";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Search, Filter } from "lucide-react";

const PAGE_SIZE = 12;

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <CoursesContent />
    </Suspense>
  );
}

function CoursesContent() {
  const { t, lang } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [path, setPath] = useState<string>("all");
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Page number lives in the URL (?page=) so it survives reloads and
  // Back/Forward; filters stay in component state as before.
  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  // Entry links like /courses?path=BEGINNER preselect the path filter once.
  useEffect(() => {
    const fromUrl = searchParams.get("path");
    if (fromUrl && ["all", ...COURSE_PATHS].includes(fromUrl)) setPath(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search text: server-side filtering must not fire per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    searchCourses({
      q: debouncedSearch || undefined,
      path: path === "all" ? undefined : path,
      take: PAGE_SIZE,
      skip: (pageFromUrl - 1) * PAGE_SIZE,
      signal: controller.signal,
    })
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setCourses(items);
        setTotal(count);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, path, pageFromUrl, retryKey]);

  const goToPage = (next: number) => {
    router.replace(next > 1 ? `/courses?page=${next}` : "/courses");
  };

  const clearFilters = () => {
    setSearch("");
    setPath("all");
    router.replace("/courses");
  };

  const pathOptions = [
    { value: "all", label: t("الكل", "All") },
    ...COURSE_PATHS.map((key) => ({ value: key, label: t(COURSE_PATH_LABELS[key].ar, COURSE_PATH_LABELS[key].en) })),
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search.trim() !== "" || path !== "all";
  // Compact window around the current page (mobile-friendly).
  const pageWindow: number[] = [];
  for (let p = Math.max(1, pageFromUrl - 2); p <= Math.min(totalPages, pageFromUrl + 2); p += 1) pageWindow.push(p);
  const ForwardIcon = lang === "ar" ? ArrowLeft : ArrowRight;
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t("الدورات التعليمية", "Educational Courses")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t(
              "اكتشف مجموعة متنوعة من الدورات في العلوم الشرعية واللغة العربية",
              "Discover a diverse range of courses in Islamic sciences and Arabic language"
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ابحث عن دورة...", "Search for a course...")}
              className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="ps-8 pe-8 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none appearance-none cursor-pointer"
              >
                {pathOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loadError ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              {t("تعذر تحميل الدورات.", "Could not load courses.")}
            </p>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : courses.length > 0 ? (
          <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-150 ${loading ? "opacity-60" : ""}`}>
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            {totalPages > 1 && (
              <nav aria-label={t("صفحات الدورات", "Course pages")} className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={pageFromUrl <= 1 || loading}
                  onClick={() => goToPage(pageFromUrl - 1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <BackIcon size={15} />
                  {t("السابق", "Previous")}
                </button>
                {pageWindow[0] > 1 && (
                  <span className="px-1 text-sm text-gray-400" aria-hidden="true">
                    …
                  </span>
                )}
                {pageWindow.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={loading}
                    onClick={() => goToPage(p)}
                    aria-current={p === pageFromUrl ? "page" : undefined}
                    className={`min-w-10 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                      p === pageFromUrl
                        ? "bg-emerald-600 text-white"
                        : "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {pageWindow[pageWindow.length - 1] < totalPages && (
                  <span className="px-1 text-sm text-gray-400" aria-hidden="true">
                    …
                  </span>
                )}
                <button
                  type="button"
                  disabled={pageFromUrl >= totalPages || loading}
                  onClick={() => goToPage(pageFromUrl + 1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  {t("التالي", "Next")}
                  <ForwardIcon size={15} />
                </button>
              </nav>
            )}
            <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
              {loading
                ? t("جارٍ التحميل...", "Loading...")
                : t(`صفحة ${pageFromUrl} من ${totalPages} · ${total} دورة`, `Page ${pageFromUrl} of ${totalPages} · ${total} courses`)}
            </p>
          </>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="aspect-[16/10] bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="p-5 space-y-2">
                  <div className="h-4 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: "80%" }} />
                  <div className="h-3 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: "55%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : hasFilters ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              {t("لم يتم العثور على نتائج مطابقة", "No matching results found")}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t("مسح البحث والتصفية", "Clear search and filters")}
            </button>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              {t("لا توجد دورات متاحة بعد.", "No courses available yet.")}
            </p>
            <Link href="/paths" className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
              {t("تصفح المسارات التعليمية", "Browse learning paths")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}