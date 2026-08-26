"use client";

import { useLang } from "@/lib/lang-context";
import { faqData } from "@/lib/mock-data";
import { useState } from "react";
import { ChevronDown, HelpCircle, Search } from "lucide-react";

export default function FAQPage() {
  const { t } = useLang();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = faqData.filter((faq) => {
    const q = search.toLowerCase();
    return (
      !q ||
      faq.question.toLowerCase().includes(q) ||
      faq.questionEn.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.answerEn.toLowerCase().includes(q)
    );
  });

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-4">
            <HelpCircle size={24} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t("الأسئلة الشائعة", "Frequently Asked Questions")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t("إجابات على الأسئلة الأكثر شيوعاً", "Answers to the most commonly asked questions")}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث في الأسئلة...", "Search questions...")}
            className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {filtered.map((faq, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-start"
              >
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {t(faq.question, faq.questionEn)}
                </span>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                    {t(faq.answer, faq.answerEn)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">
              {t("لم يتم العثور على نتائج", "No results found")}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-8 border border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t("لم تجد إجابة على سؤالك؟", "Didn't find an answer to your question?")}
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl transition-colors text-sm"
          >
            {t("تواصل معنا", "Contact Us")}
          </a>
        </div>
      </div>
    </div>
  );
}
