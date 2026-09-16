"use client";

import { useLang } from "@/lib/lang-context";
import { useEffect, useState } from "react";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import SirajLoading from "@/components/ui/SirajLoading";

interface ApiFaq {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: string;
  orderIndex: number;
}

export default function FAQPage() {
  const { t } = useLang();
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [faqs, setFaqs] = useState<ApiFaq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faqs")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => setFaqs(Array.isArray(data) ? (data as ApiFaq[]) : []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const filtered = faqs.filter((faq) => {
    const q = search.toLowerCase();
    return (
      !q ||
      faq.questionAr.toLowerCase().includes(q) ||
      faq.questionEn.toLowerCase().includes(q) ||
      faq.answerAr.toLowerCase().includes(q) ||
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
        {loading ? (
          <SirajLoading />
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((faq) => (
              <div
                key={faq.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-start"
                >
                  <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    {t(faq.questionAr, faq.questionEn)}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                      openIndex === faq.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openIndex === faq.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                      {t(faq.answerAr, faq.answerEn)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            {t("لا توجد أسئلة مطابقة", "No matching questions")}
          </p>
        )}
      </div>
    </div>
  );
}
