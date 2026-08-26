"use client";

import { useLang } from "@/lib/lang-context";
import Link from "next/link";
import { BookOpen, FileText, Search, Mic } from "lucide-react";
import type { Book, Article, Research, Lecture } from "@/lib/mock-data";

type LibraryItem = { type: string; typeEn: string } & (Book | Article | Research | Lecture);

export default function LibraryCard({ item }: { item: LibraryItem }) {
  const { t, lang } = useLang();
  const type = item.type;
  const typeEn = item.typeEn;

  const getIcon = () => {
    switch (type) {
      case "book": return <BookOpen size={20} />;
      case "article": return <FileText size={20} />;
      case "research": return <Search size={20} />;
      case "lecture": return <Mic size={20} />;
      default: return <BookOpen size={20} />;
    }
  };

  const getTitle = () => {
    if ("title" in item) return t(item.title, item.titleEn);
    return "";
  };

  const getAuthor = () => {
    if ("author" in item) return t(item.author, item.authorEn);
    if ("speaker" in item) return t(item.speaker, item.speakerEn);
    return "";
  };

  const getCategory = () => {
    if ("category" in item) return t(item.category, item.categoryEn);
    if ("field" in item) return t(item.field, item.fieldEn);
    return "";
  };

  const getHref = () => `/library/${item.id}`;

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
    <Link href={getHref()} className="group block">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5">
        <div className={`h-32 bg-gradient-to-br ${getColor()} flex items-center justify-center relative`}>
          <div className="opacity-40">{getIcon()}</div>
          <div className="absolute top-3 end-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              {t(type === "book" ? "كتاب" : type === "article" ? "مقال" : type === "research" ? "بحث" : "محاضرة",
                 type === "book" ? "Book" : type === "article" ? "Article" : type === "research" ? "Research" : "Lecture")}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {getTitle()}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{getAuthor()}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
              {getCategory()}
            </span>
            {"pages" in item && (
              <span className="text-xs text-gray-400">
                {item.pages} {t("صفحة", "pages")}
              </span>
            )}
            {"readTime" in item && (
              <span className="text-xs text-gray-400">{item.readTime}</span>
            )}
            {"duration" in item && type === "lecture" && (
              <span className="text-xs text-gray-400">{(item as Lecture).duration}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
