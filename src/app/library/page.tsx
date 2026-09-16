"use client";

import { useLang } from "@/lib/lang-context";
import LibraryCard from "@/components/library/LibraryCard";
import { fetchCategories, fetchLibrary, type ApiCategory, type ApiLibraryItem } from "@/lib/library-api";
import { useEffect, useState } from "react";
import { BookOpen, FileText, Search, Mic } from "lucide-react";
import SirajLoading from "@/components/ui/SirajLoading";

type Tab = "books" | "articles" | "research" | "lectures";

const TAB_META: { key: Tab; type: string; label: string; labelEn: string; icon: React.ReactNode }[] = [
  { key: "books", type: "book", label: "الكتب", labelEn: "Books", icon: <BookOpen size={16} /> },
  { key: "articles", type: "article", label: "المقالات", labelEn: "Articles", icon: <FileText size={16} /> },
  { key: "research", type: "research", label: "الأبحاث", labelEn: "Research", icon: <Search size={16} /> },
  { key: "lectures", type: "lecture", label: "المحاضرات", labelEn: "Lectures", icon: <Mic size={16} /> },
];

export default function LibraryPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("books");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [items, setItems] = useState<ApiLibraryItem[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ books: 0, articles: 0, research: 0, lectures: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const active = TAB_META.find((entry) => entry.key === tab);
      Promise.all([
        fetchLibrary({ type: active?.type, q: search || undefined, categoryId: categoryId || undefined, take: 50 }),
        ...TAB_META.map((entry) => fetchLibrary({ type: entry.type, take: 1 })),
      ])
        .then(([result, ...totals]) => {
          if (cancelled) return;
          setItems(result.items);
          setCounts({
            books: totals[0]?.total ?? 0,
            articles: totals[1]?.total ?? 0,
            research: totals[2]?.total ?? 0,
            lectures: totals[3]?.total ?? 0,
          });
        })
        .catch(() => {
          if (!cancelled) setError(t("تعذر تحميل المكتبة", "Could not load the library"));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab, search, categoryId, t]);

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t("المكتبة الرقمية", "Digital Library")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t(
              "اكتشف كتب العلماء والمقالات والأبحاث والمحاضرات في العلوم الشرعية",
              "Discover scholars' books, articles, research papers, and lectures in Islamic sciences"
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TAB_META.map((t_item) => (
            <button
              key={t_item.key}
              onClick={() => { setTab(t_item.key); setSearch(""); setCategoryId(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                tab === t_item.key
                  ? "bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700"
              }`}
            >
              {t_item.icon}
              {t(t_item.label, t_item.labelEn)}
              <span className={`text-xs px-1.5 py-0.5 rounded ${tab === t_item.key ? "bg-emerald-600" : "bg-gray-100 dark:bg-gray-800"}`}>
                {counts[t_item.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + category */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ابحث في المكتبة...", "Search the library...")}
              className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none appearance-none cursor-pointer"
          >
            <option value="">{t("كل التصنيفات", "All categories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{t(category.nameAr, category.nameEn)}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <SirajLoading />
        ) : error ? (
          <p className="text-center text-red-600 dark:text-red-400 py-20">{error}</p>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <LibraryCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {t("لم يتم العثور على نتائج", "No results found")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
