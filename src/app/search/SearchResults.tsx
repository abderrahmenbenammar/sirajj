"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { searchCourses, type CourseCardData } from "@/lib/courses-api";
import { fetchLibrary, type ApiLibraryItem } from "@/lib/library-api";
import CourseCard from "@/components/courses/CourseCard";
import LibraryCard from "@/components/library/LibraryCard";

const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";

function CardsSkeleton() {
  return (
    <div className={GRID} aria-hidden="true">
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
  );
}

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLang();
  const q = (searchParams.get("q") ?? "").trim();

  const [input, setInput] = useState(q);
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [courseTotal, setCourseTotal] = useState(0);
  const [items, setItems] = useState<ApiLibraryItem[]>([]);
  const [libTotal, setLibTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Keep the input in sync with the URL (Back/Forward support).
  useEffect(() => {
    setInput(q);
  }, [q]);

  // Debounced URL update while typing (300ms) so the query is shareable.
  useEffect(() => {
    const value = input.trim();
    if (value === q) return;
    const timer = setTimeout(() => {
      router.replace(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
    }, 300);
    return () => clearTimeout(timer);
  }, [input, q, router]);

  // Fetch on settled query only (2+ chars) — never dump the whole catalog.
  useEffect(() => {
    if (q.length < 2) {
      setCourses([]);
      setCourseTotal(0);
      setItems([]);
      setLibTotal(0);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const controller = new AbortController();
    void (async () => {
      try {
        const [c, l] = await Promise.all([
          searchCourses({ q, take: 50 }),
          fetchLibrary({ q, take: 50 }, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setCourses(c.items);
        setCourseTotal(c.total);
        setItems(l.items);
        setLibTotal(l.total);
      } catch {
        // Aborted or failed: show calm empty state, never technical errors.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [q]);

  const hasResults = courses.length > 0 || items.length > 0;

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t("نتائج البحث", "Search results")}
        </h1>
        {q && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("البحث عن:", "Searching for:")} <span className="font-medium text-gray-900 dark:text-white">{q}</span>
          </p>
        )}

        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 mb-8">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ابحث عن دورات، كتب، مقالات...", "Search courses, books, articles...")}
            aria-label={t("بحث", "Search")}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
          />
        </div>

        {loading ? (
          <div className="space-y-8">
            <CardsSkeleton />
          </div>
        ) : !searched ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("اكتب كلمة للبحث في الدورات والمكتبة.", "Type a word to search courses and library.")}</p>
          </div>
        ) : !hasResults ? (
          <div className="py-10 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("لم يتم العثور على نتائج", "No results found")}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("جرّب استخدام كلمة أخرى أو صياغة مختلفة.", "Try a different word or phrasing.")}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {courses.length > 0 && (
              <section aria-label={t("الدورات", "Courses")}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {t("الدورات", "Courses")} ({courseTotal})
                </h2>
                <div className={GRID}>
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            )}
            {items.length > 0 && (
              <section aria-label={t("المكتبة", "Library")}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {t("المكتبة", "Library")} ({libTotal})
                </h2>
                <div className={GRID}>
                  {items.map((item) => (
                    <LibraryCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t("لم تجد ما تبحث عنه؟ جرّب كلمة أخرى.", "Didn't find what you're looking for? Try another word.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
