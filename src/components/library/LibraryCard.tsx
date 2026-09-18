"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import Link from "next/link";
import { BookOpen, FileText, Search, Mic } from "lucide-react";
import type { ApiLibraryItem } from "@/lib/library-api";

export default function LibraryCard({ item }: { item: ApiLibraryItem }) {
  const { t } = useLang();
  const [broken, setBroken] = useState(false);
  const type = item.type;
  const cover = item.coverImageUrl && !broken;

  const getIcon = () => {
    switch (type) {
      case "book": return <BookOpen size={20} />;
      case "article": return <FileText size={20} />;
      case "research": return <Search size={20} />;
      case "lecture": return <Mic size={20} />;
      default: return <BookOpen size={20} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case "book": return "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 text-amber-700 dark:text-amber-400";
      case "article": return "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 text-blue-700 dark:text-blue-400";
      case "research": return "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20 text-purple-700 dark:text-purple-400";
      case "lecture": return "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 text-emerald-700 dark:text-emerald-400";
      default: return "from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <Link href={`/library/${item.id}`} className="group block">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5">
        <div className={`relative ${cover ? "" : `bg-gradient-to-br ${getColor()} flex items-center justify-center`} ${type === "book" ? "aspect-[3/4]" : "h-32"}`}>
          {cover ? (
            <img
              src={item.coverImageUrl ?? ""}
              alt={t(item.titleAr, item.titleEn)}
              loading="lazy"
              onError={() => setBroken(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="opacity-40">{getIcon()}</div>
          )}
          <div className="absolute top-3 end-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              {t(type === "book" ? "كتاب" : type === "article" ? "مقال" : type === "research" ? "بحث" : "محاضرة",
                 type === "book" ? "Book" : type === "article" ? "Article" : type === "research" ? "Research" : "Lecture")}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {t(item.titleAr, item.titleEn)}
          </h3>
          {item.authorName && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.authorName}</p>}
          <div className="flex items-center gap-2">
            {(item.categoryAr || item.categoryEn) && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                {t(item.categoryAr ?? "", item.categoryEn ?? "")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
