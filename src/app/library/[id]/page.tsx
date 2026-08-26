"use client";

import { use } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { books, articles, research, lectures } from "@/lib/mock-data";
import { ArrowLeft, ArrowRight, BookOpen, Clock, User, Calendar } from "lucide-react";

export default function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLang();

  const book = books.find((b) => b.id === id);
  const article = articles.find((a) => a.id === id);
  const res = research.find((r) => r.id === id);
  const lecture = lectures.find((l) => l.id === id);

  if (book) {
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <Link href="/library" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("المكتبة", "Library")}</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{t(book.title, book.titleEn)}</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-8 sm:p-10">
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 dark:bg-gray-900/80 text-amber-700 dark:text-amber-400 inline-block mb-4">
                {t("كتاب", "Book")}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                {t(book.title, book.titleEn)}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-4">
                <User size={15} /> {t(book.author, book.authorEn)}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {book.pages} {t("صفحة", "pages")}</span>
                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg">
                  {t(book.category, book.categoryEn)}
                </span>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(book.description, book.descriptionEn)}
              </p>
            </div>
            <div className="p-8 sm:p-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("محتوى الكتاب", "Book Content")}</h2>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {t(book.content, book.contentEn).split("\n\n").map((para, i) => (
                  <p key={i} className="text-gray-600 dark:text-gray-400 leading-loose mb-4 text-base" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (article) {
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <Link href="/library" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("المكتبة", "Library")}</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{t(article.title, article.titleEn)}</span>
          </div>

          <article className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 sm:p-10">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 inline-block mb-4">
              {t("مقال", "Article")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
              {t(article.title, article.titleEn)}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              <span className="flex items-center gap-1.5"><User size={14} /> {t(article.author, article.authorEn)}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {article.date}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} /> {article.readTime}</span>
              <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg">
                {t(article.category, article.categoryEn)}
              </span>
            </div>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {t(article.content, article.contentEn).split("\n\n").map((para, i) => (
                <p key={i} className="text-gray-600 dark:text-gray-400 leading-loose mb-4 text-base">
                  {para}
                </p>
              ))}
            </div>
          </article>
        </div>
      </div>
    );
  }

  if (res) {
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <Link href="/library" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("المكتبة", "Library")}</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{t(res.title, res.titleEn)}</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 sm:p-10">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 inline-block mb-4">
              {t("بحث علمي", "Research")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
              {t(res.title, res.titleEn)}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span className="flex items-center gap-1.5"><User size={14} /> {t(res.author, res.authorEn)}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {res.date}</span>
              <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-lg">
                {t(res.field, res.fieldEn)}
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("ملخص البحث", "Abstract")}</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(res.abstract, res.abstractEn)}
              </p>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("محتوى البحث", "Research Content")}</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {t(res.content, res.contentEn).split("\n\n").map((para, i) => (
                <p key={i} className="text-gray-600 dark:text-gray-400 leading-loose mb-4 text-base">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lecture) {
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <Link href="/library" className="hover:text-emerald-600 dark:hover:text-emerald-400">{t("المكتبة", "Library")}</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{t(lecture.title, lecture.titleEn)}</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-8 sm:p-10">
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 dark:bg-gray-900/80 text-emerald-700 dark:text-emerald-400 inline-block mb-4">
                {t("محاضرة", "Lecture")}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                {t(lecture.title, lecture.titleEn)}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><User size={14} /> {t(lecture.speaker, lecture.speakerEn)}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {lecture.date}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> {lecture.duration}</span>
                <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  {t(lecture.category, lecture.categoryEn)}
                </span>
              </div>
            </div>
            <div className="p-8 sm:p-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("وصف المحاضرة", "Lecture Description")}</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base">
                {t(lecture.description, lecture.descriptionEn)}
              </p>

              <div className="mt-8 aspect-video bg-gray-900 dark:bg-gray-950 rounded-xl flex items-center justify-center border border-gray-800">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-white ms-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-400">{t("تشغيل المحاضرة", "Play Lecture")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
