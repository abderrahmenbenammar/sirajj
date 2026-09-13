"use client";

import { useLang } from "@/lib/lang-context";
import CourseCard from "@/components/courses/CourseCard";
import { fetchCourses, type ApiCourse } from "@/lib/courses-api";
import { useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";

export default function CoursesPage() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [courses, setCourses] = useState<ApiCourse[]>([]);

  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  const levels = [
    { value: "all", label: t("الكل", "All") },
    { value: "مبتدئ", label: t("مبتدئ", "Beginner") },
    { value: "متوسط", label: t("متوسط", "Intermediate") },
    { value: "متقدم", label: t("متقدم", "Advanced") },
  ];

  const categories = [
    { value: "all", label: t("الكل", "All") },
    ...Array.from(new Set(courses.map((c) => c.category))).map((cat) => ({
      value: cat,
      label: cat,
    })),
  ];

  const filtered = courses.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.titleEn.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = level === "all" || c.level === level;
    const matchesCat = category === "all" || c.category === category;
    return matchesSearch && matchesLevel && matchesCat;
  });

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
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="ps-8 pe-8 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none appearance-none cursor-pointer"
              >
                {levels.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none appearance-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {t("لم يتم العثور على نتائج مطابقة", "No matching results found")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
