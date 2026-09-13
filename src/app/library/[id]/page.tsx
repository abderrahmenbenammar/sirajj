"use client";

import { use } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { fetchLibraryItem, type ApiLibraryItem } from "@/lib/library-api";
import { useEffect, useState } from "react";
import { BookOpen, FileText, Search, Mic, User, Calendar, ExternalLink } from "lucide-react";

const TYPE_META: Record<string, { label: string; labelEn: string; icon: React.ReactNode; badge: string }> = {
  book: { label: "كتاب", labelEn: "Book", icon: <BookOpen size={14} />, badge: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" },
  article: { label: "مقال", labelEn: "Article", icon: <FileText size={14} />, badge: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400" },
  research: { label: "بحث علمي", labelEn: "Research", icon: <Search size={14} />, badge: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400" },
  lecture: { label: "محاضرة", labelEn: "Lecture", icon: <Mic size={14} />, badge: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" },
};

export default function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLang();
  const [item, setItem] = useState<ApiLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetchLibraryItem(id)
      .then((data) => {
        if (!data) setMissing(true);
        else setItem(data);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-gray-500 dark:text-gray-400">{t("جارٍ التحميل...", "Loading...")}</div>;
  }

  if (missing || !item) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t("العنصر غير موجود", "Item not found")}
        </h1>
        <Link href="/library" className="text-emerald-700 dark:text-emerald-400 hover:underline">
          {t("العودة للمكتبة", "Back to library")}
        </Link>
      </div>
    );
  }

  const meta = TYPE_META[item.type] ?? TYPE_META.book;

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/library" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("المكتبة", "Library")}</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t(item.titleAr, item.titleEn)}</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
          <div className="p-8 sm:p-10">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 mb-4 ${meta.badge}`}>
              {meta.icon} {t(meta.label, meta.labelEn)}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
              {t(item.titleAr, item.titleEn)}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              {item.authorName && (
                <span className="flex items-center gap-1.5"><User size={14} /> {item.authorName}</span>
              )}
              {(item.categoryAr || item.categoryEn) && (
                <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  {t(item.categoryAr ?? "", item.categoryEn ?? "")}
                </span>
              )}
              {item.publishedAt && (
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(item.publishedAt).toLocaleDateString("ar")}</span>
              )}
            </div>
            {(item.descriptionAr || item.descriptionEn) && (
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                {t(item.descriptionAr ?? "", item.descriptionEn ?? "")}
              </p>
            )}
            <a
              href={item.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors"
            >
              <ExternalLink size={16} />
              {t("فتح المحتوى", "Open content")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
