"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { fetchLibrary } from "@/lib/library-api";
import { fetchCourses, type ApiCourse } from "@/lib/courses-api";
import { useEffect, useState } from "react";
import CourseCard from "@/components/courses/CourseCard";
import { ArrowLeft, ArrowRight, BookOpen, FileText, Search, Mic, Sparkles, GraduationCap, Users, Globe } from "lucide-react";

export default function HomePage() {
  const { t, lang } = useLang();
  const [featuredCourses, setFeaturedCourses] = useState<ApiCourse[]>([]);
  const [libraryCounts, setLibraryCounts] = useState({ book: 0, article: 0, research: 0, lecture: 0 });

  useEffect(() => {
    fetchCourses().then((data) => setFeaturedCourses(data.slice(0, 4)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchLibrary({ type: "book", take: 1 }),
      fetchLibrary({ type: "article", take: 1 }),
      fetchLibrary({ type: "research", take: 1 }),
      fetchLibrary({ type: "lecture", take: 1 }),
    ])
      .then(([book, article, research, lecture]) => {
        if (!cancelled) setLibraryCounts({ book: book.total, article: article.total, research: research.total, lecture: lecture.total });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const libraryTabs = [
    { icon: <BookOpen size={20} />, count: libraryCounts.book, label: t("الكتب", "Books"), href: "/library?tab=books" },
    { icon: <FileText size={20} />, count: libraryCounts.article, label: t("المقالات", "Articles"), href: "/library?tab=articles" },
    { icon: <Search size={20} />, count: libraryCounts.research, label: t("الأبحاث", "Research"), href: "/library?tab=research" },
    { icon: <Mic size={20} />, count: libraryCounts.lecture, label: t("المحاضرات", "Lectures"), href: "/library?tab=lectures" },
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-emerald-50 via-white to-gray-50 dark:from-emerald-950/20 dark:via-gray-950 dark:to-gray-950 py-24 sm:py-32 lg:py-40">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 end-0 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-800/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -start-20 w-72 h-72 bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-full mb-8 border border-emerald-200/50 dark:border-emerald-800/50">
            <Sparkles size={14} />
            {t("أكاديمية تعليمية إسلامية متكاملة", "A comprehensive Islamic learning academy")}
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
            style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
          >
            {t("رحلتك في طلب العلم", "Your Journey in Seeking Knowledge")}
            <br />
            <span className="text-emerald-700 dark:text-emerald-400">
              {t("تبدأ هنا", "Starts Here")}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
            {t(
              "منصة تعليمية شاملة للعلوم الشرعية تقدم دورات متنوعة ومكتبة رقمية غنية بأقلام العلماء والباحثين.",
              "A comprehensive platform for Islamic sciences offering diverse courses and a rich digital library from scholars and researchers."
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
            >
              {t("استكشف الدورات", "Explore Courses")}
              {lang === "ar" ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              <BookOpen size={18} />
              {t("تصفح المكتبة", "Browse Library")}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-gray-100 dark:border-gray-800/50 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "12+", label: t("دورة تعليمية", "Courses"), icon: <GraduationCap size={22} /> },
              { value: "12+", label: t("كتاب مرجع", "Reference Books"), icon: <BookOpen size={22} /> },
              { value: "5+", label: t("باحث ومعلم", "Scholars & Teachers"), icon: <Users size={22} /> },
              { value: "2", label: t("لغة مدعومة", "Supported Languages"), icon: <Globe size={22} /> },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-3">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {t("الدورات المميزة", "Featured Courses")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t("ابدأ رحلتك العلمية مع أفضل الدورات", "Start your academic journey with our best courses")}
              </p>
            </div>
            <Link
              href="/courses"
              className="hidden sm:inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
            >
              {t("عرض الكل", "View All")}
              {lang === "ar" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </Link>
          </div>
          {featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">
              {t("لا توجد دورات منشورة بعد.", "No published courses yet.")}
            </p>
          )}
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium"
            >
              {t("عرض الكل", "View All")}
              {lang === "ar" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </Link>
          </div>
        </div>
      </section>

      {/* Library Preview */}
      <section className="py-20 sm:py-24 bg-white dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {t("المكتبة الرقمية", "Digital Library")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              {t(
                "مجموعة شاملة من الكتب والمقالات والأبحاث والمحاضرات في مختلف العلوم الشرعية.",
                "A comprehensive collection of books, articles, research papers, and lectures in various Islamic sciences."
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {libraryTabs.map((tab, i) => (
              <Link
                key={i}
                href={tab.href}
                className="flex flex-col items-center gap-3 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-gray-100 dark:border-gray-800 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  {tab.icon}
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{tab.count}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{tab.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-12 sm:p-16 text-white relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -end-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -start-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4"
                style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
              >
                {t("ابدأ رحلتك في طلب العلم اليوم", "Start Your Knowledge Journey Today")}
              </h2>
              <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
                {t(
                  "انضم إلى آلاف الطلاب المتخصصين في العلوم الشرعية واحصل على وصول كامل لدوراتنا ومكتبتنا.",
                  "Join thousands of students specializing in Islamic sciences and get full access to our courses and library."
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5"
                >
                  {t("سجل مجاناً", "Register Free")}
                  {lang === "ar" ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500/20 text-white font-semibold rounded-xl hover:bg-emerald-500/30 border border-emerald-400/30 transition-all duration-200"
                >
                  {t("تعرف علينا أكثر", "Learn More About Us")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
