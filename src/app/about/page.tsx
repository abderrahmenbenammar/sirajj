"use client";

import { useLang } from "@/lib/lang-context";
import { Target, BookOpen, Users, Globe, Shield, Heart } from "lucide-react";

export default function AboutPage() {
  const { t } = useLang();

  const values = [
    { icon: <Shield size={22} />, title: t("الصدق والأمانة", "Integrity & Trust"), desc: t("نلتزم بأعلى معايير الأمانة العلمية والمصداقية في كل ما نقدمه.", "We adhere to the highest standards of academic integrity and credibility in everything we present.") },
    { icon: <Target size={22} />, title: t("الجودة والتميز", "Quality & Excellence"), desc: t("نسعى لتقديم محتوى تعليمي عالي الجودة يلبي تطلعات الطلاب.", "We strive to deliver high-quality educational content that meets students' aspirations.") },
    { icon: <Heart size={22} />, title: t("الإخلاص في الخدمة", "Sincerity in Service"), desc: t("نخدم العلم والطلاب بإخلاص وتفانٍ لوجه الله تعالى.", "We serve knowledge and students with sincerity and dedication for the sake of God Almighty.") },
    { icon: <Users size={22} />, title: t("الشمولية", "Inclusivity"), desc: t("العلم حق للجميع، منصة مفتوحة لكل من يطلب العلم الشرعي.", "Knowledge is a right for everyone; an open platform for all seekers of religious knowledge.") },
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full inline-block mb-6">
            {t("عن أكاديمية سراج", "About SIRAJ Academy")}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
            {t("رسالتنا هي نشر العلم الشرعي", "Our Mission is to Spread Religious Knowledge")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(
              "أكاديمية سراج (سراج) هي منصة تعليمية إسلامية حديثة تأسست لتحقيق رؤية فريدة في تقديم العلم الشرعي بشكل عصري ومنهجي متكامل، متاحة للطلاب حول العالم.",
              "SIRAJ Academy (سراج) is a modern Islamic educational platform established to realize a unique vision of presenting religious knowledge in a contemporary, systematic, and comprehensive manner, accessible to students worldwide."
            )}
          </p>
        </div>
      </section>

      {/* Vision */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {t("رؤيتنا", "Our Vision")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {t(
                  "أن نكون المنصة التعليمية الرائدة في العالم الإسلامي لتقديم العلوم الشرعية بطريقة حديثة وتفاعلية تجمع بين الأصالة والمعاصرة، ونسعى لإعداد جيل متمكن من العلم الشرعي قادر على خدمة دينه وأمته.",
                  "To be the leading educational platform in the Islamic world for presenting religious sciences in a modern and interactive manner that combines authenticity with contemporaneity. We aim to prepare a generation proficient in religious knowledge, capable of serving their faith and community."
                )}
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(
                  "نؤمن بأن العلم الشرعي نور يهتدى به في ظلمات الشبهات والشهوات، وأنaccès إليه يجب أن يكون متاحاً لكل مسلم يطلب العلم حيثما كان.",
                  "We believe that religious knowledge is a light by which one is guided through the darknesses of doubts and desires, and that access to it should be available to every Muslim seeking knowledge wherever they may be."
                )}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-2xl p-8 sm:p-10 border border-emerald-100 dark:border-emerald-900/30">
              <div className="w-14 h-14 rounded-2xl bg-emerald-200/50 dark:bg-emerald-800/50 flex items-center justify-center mb-6">
                <BookOpen size={24} className="text-emerald-700 dark:text-emerald-400" />
              </div>
              <blockquote className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                {t("طلب العلم فريضة على كل مسلم", "Seeking knowledge is an obligation upon every Muslim")}
              </blockquote>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("— الحديث النبوي الشريف", "— Prophetic Hadith")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Methodology */}
      <section className="py-16 sm:py-20 bg-white dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {t("منهجيتنا التعليمية", "Our Educational Methodology")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t(
                "نعتمد منهجية علمية متكاملة تجمع بين التعلم النظري والتطبيق العملي",
                "We adopt a comprehensive scientific methodology that combines theoretical learning with practical application"
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: t("المنهج العلمي الأصيل", "Authentic Scientific Methodology"), desc: t("تتبع المنهج العلمي الراسخ في العلوم الشرعية مع الاستناد إلى المصادر الأصلية والمراجع المعتمدة.", "Following the established scientific methodology in religious sciences with reference to original sources and approved references.") },
              { title: t("التعلم التفاعلي", "Interactive Learning"), desc: t("استخدام أحدث وسائل التعليم التفاعلي مثل الفيديوهات والاختبارات والتمارين العملية.", "Using the latest interactive education tools such as videos, quizzes, and practical exercises.") },
              { title: t("الإشراف العلمي", "Academic Supervision"), desc: t("جميع الدورات تحت إشراف علماء متخصصين ضماناً لدقة المحتوى وسلامته.", "All courses are supervised by specialized scholars to ensure the accuracy and integrity of the content.") },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <span className="font-bold text-sm">{i + 1}</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-10 text-center">
            {t("قيمنا الأساسية", "Our Core Values")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <div key={i} className="flex items-start gap-4 p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{v.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Objectives */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            {t("أهدافنا", "Our Objectives")}
          </h2>
          <ul className="space-y-4">
            {[
              t("تقديم دورات تعليمية متنوعة في العلوم الشرعية بمعايير عالمية", "Offering diverse educational courses in religious sciences with global standards"),
              t("بناء مكتبة رقمية شاملة من الكتب والمقالات والأبحاث", "Building a comprehensive digital library of books, articles, and research"),
              t("توفير بيئة تعلم تفاعلية مدعومة بأحدث التقنيات", "Providing an interactive learning environment supported by latest technologies"),
              t("إعداد متعلمين متمكنين من العلوم الشرعية قادرين على خدمة مجتمعاتهم", "Preparing learners proficient in religious sciences capable of serving their communities"),
              t("تعزيز التواصل بين الطلاب والعلماء والمختصين", "Strengthening communication between students, scholars, and specialists"),
              t("دعم البحث العلمي في العلوم الشرعي المعاصرة", "Supporting scientific research in contemporary religious sciences"),
            ].map((obj, i) => (
              <li key={i} className="flex items-start gap-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-600 dark:text-gray-400 leading-relaxed">{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
