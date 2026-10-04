"use client";

import { useLang } from "@/lib/lang-context";
import { Database, ClipboardList, Share2, Cookie, Lock, UserRound, RefreshCw, Mail } from "lucide-react";

export default function PrivacyPage() {
  const { t } = useLang();

  const sections = [
    {
      icon: <Database size={20} />,
      title: t("البيانات التي نجمعها", "Data We Collect"),
      body: t(
        "نجمع البيانات التي تقدّمها عند التسجيل (الاسم والبريد الإلكتروني) وبيانات استخدامك التعليمية مثل الدورات المجتازة ونتائج الاختبارات لتحسين تجربتك.",
        "We collect the data you provide when registering (name and email address) and your learning activity such as completed courses and quiz results to improve your experience.",
      ),
    },
    {
      icon: <ClipboardList size={20} />,
      title: t("كيفية استخدام البيانات", "How We Use Data"),
      body: t(
        "نستخدم بياناتك لإنشاء حسابك، ومتابعة تقدّمك التعليمي، وإرسال الإشعارات المهمة، وتحسين جودة الخدمات، والالتزام بالمتطلبات النظامية.",
        "We use your data to create your account, track your progress, send important notifications, improve service quality, and comply with legal requirements.",
      ),
    },
    {
      icon: <Share2 size={20} />,
      title: t("مشاركة البيانات", "Data Sharing"),
      body: t(
        "لا نبيع بياناتك الشخصية ولا نشاركها مع أطراف ثالثة لأغراض تسويقية، ولا نشاركها إلا بموافقتك أو عندما يتطلب القانون ذلك.",
        "We do not sell your personal data or share it with third parties for marketing purposes; we only share it with your consent or when required by law.",
      ),
    },
    {
      icon: <Cookie size={20} />,
      title: t("ملفات الارتباط", "Cookies"),
      body: t(
        "تستخدم المنصة ملفات ارتباط ضرورية لتسجيل دخولك وحفظ تفضيلاتك، ويمكنك تعطيلها من إعدادات المتصفح مع احتمال تأثر بعض الوظائف.",
        "The platform uses essential cookies to keep you signed in and remember your preferences; you may disable them in your browser settings, though some features may be affected.",
      ),
    },
    {
      icon: <Lock size={20} />,
      title: t("أمان البيانات", "Data Security"),
      body: t(
        "نطبق إجراءات تقنية وتنظيمية مناسبة لحماية بياناتك من الوصول أو الإفصاح أو التعديل غير المصرح به، مع مراجعة هذه الإجراءات دوريًا.",
        "We apply appropriate technical and organizational measures to protect your data against unauthorized access, disclosure, or modification, and review them periodically.",
      ),
    },
    {
      icon: <UserRound size={20} />,
      title: t("حقوقك", "Your Rights"),
      body: t(
        "يحق لك الاطلاع على بياناتك وتصحيحها وطلب حذف حسابك في أي وقت، ويمكنك ممارسة هذه الحقوق عبر صفحة «اتصل بنا».",
        "You have the right to access and correct your data and request account deletion at any time, which you can exercise through the \"Contact\" page.",
      ),
    },
    {
      icon: <RefreshCw size={20} />,
      title: t("تحديث السياسة", "Policy Updates"),
      body: t(
        "قد نُحدّث هذه السياسة من وقت لآخر، وسيتم نشر أي تعديل على هذه الصفحة مع تاريخ آخر تحديث.",
        "We may update this policy from time to time; any changes will be posted on this page along with the last updated date.",
      ),
    },
  ];

  return (
    <div className="overflow-hidden">
      <section className="py-16 sm:py-20 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full inline-block mb-6">
            {t("قانوني", "Legal")}
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
          >
            {t("سياسة الخصوصية", "Privacy Policy")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(
              "آخر تحديث: أكتوبر 2026 — توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لبياناتك.",
              "Last updated: October 2026 — this policy explains how we collect, use, and protect your data.",
            )}
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-2">{t("مقدمة", "Introduction")}</h2>
            <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
              {t(
                "تحترم أكاديمية سراج خصوصية مستخدميها وتلتزم بحماية بياناتهم الشخصية وفق أعلى المعايير المعمولة.",
                "SIRAJ Academy respects its users' privacy and is committed to protecting their personal data according to the highest accepted standards.",
              )}
            </p>
          </div>

          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 flex items-start gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                {section.icon}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white mb-2">{section.title}</h2>
                <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{section.body}</p>
              </div>
            </div>
          ))}

          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 p-6 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">
                {t("للاستفسارات", "Contact")}
              </h2>
              <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                {t(
                  "لأي استفسار حول خصوصيتك أو بياناتك، يرجى التواصل معنا عبر صفحة «اتصل بنا» على الموقع.",
                  "For any question about your privacy or data, please reach us through the \"Contact\" page.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
