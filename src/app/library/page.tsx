"use client";

import { useLang } from "@/lib/lang-context";
import { books, articles, research, lectures } from "@/lib/mock-data";
import LibraryCard from "@/components/library/LibraryCard";
import { useState } from "react";
import { BookOpen, FileText, Search, Mic } from "lucide-react";

type Tab = "books" | "articles" | "research" | "lectures";

export default function LibraryPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("books");
  const [search, setSearch] = useState("");

  const tabs: { key: Tab; label: string; labelEn: string; icon: React.ReactNode; count: number }[] = [
    { key: "books", label: "الكتب", labelEn: "Books", icon: <BookOpen size={16} />, count: books.length },
    { key: "articles", label: "المقالات", labelEn: "Articles", icon: <FileText size={16} />, count: articles.length },
    { key: "research", label: "الأبحاث", labelEn: "Research", icon: <Search size={16} />, count: research.length },
    { key: "lectures", label: "المحاضرات", labelEn: "Lectures", icon: <Mic size={16} />, count: lectures.length },
  ];

  const getItems = () => {
    const q = search.toLowerCase();
    switch (tab) {
      case "books":
        return books
          .filter((b) => !q || b.title.toLowerCase().includes(q) || b.titleEn.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.authorEn.toLowerCase().includes(q))
          .map((b) => ({ ...b, type: "book" as const, typeEn: "Book" }));
      case "articles":
        return articles
          .filter((a) => !q || a.title.toLowerCase().includes(q) || a.titleEn.toLowerCase().includes(q))
          .map((a) => ({ ...a, type: "article" as const, typeEn: "Article" }));
      case "research":
        return research
          .filter((r) => !q || r.title.toLowerCase().includes(q) || r.titleEn.toLowerCase().includes(q))
          .map((r) => ({ ...r, type: "research" as const, typeEn: "Research" }));
      case "lectures":
        return lectures
          .filter((l) => !q || l.title.toLowerCase().includes(q) || l.titleEn.toLowerCase().includes(q))
          .map((l) => ({ ...l, type: "lecture" as const, typeEn: "Lecture" }));
    }
  };

  const items = getItems();

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
          {tabs.map((t_item) => (
            <button
              key={t_item.key}
              onClick={() => { setTab(t_item.key); setSearch(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                tab === t_item.key
                  ? "bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700"
              }`}
            >
              {t_item.icon}
              {t(t_item.label, t_item.labelEn)}
              <span className={`text-xs px-1.5 py-0.5 rounded ${tab === t_item.key ? "bg-emerald-600" : "bg-gray-100 dark:bg-gray-800"}`}>
                {t_item.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث في المكتبة...", "Search the library...")}
            className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Grid */}
        {items && items.length > 0 ? (
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
