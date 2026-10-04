"use client";

import { useLang } from "@/lib/lang-context";
import { Scale, UserCheck, BookOpen, ShieldAlert, Copyright, Ban, RefreshCw, Mail } from "lucide-react";

export default function TermsPage() {
  const { t } = useLang();

  const sections = [
    {
      icon: <UserCheck size={20} />,
      title: t("قبول الشروط", "Acceptance of Terms"),
      body: t(
        "باستخدامك منصة أكاديمية سراج، فإنك تقر بقراءتك هذه الشروط والأحكام والموافقة عليها. إذا كنت لا توافق على أي بند منها، يرجى عدم استخدام المنصة.",
        "By using SIRAJ Academy, you acknowledge that you have read these terms and agree to them. If you do not agree with any part of them, please do not use the platform.",
      ),
    },
    {
      icon: <BookOpen size={20} />,
      title: t("الحساب والاستخدام", "Account and Use"),
      body: t(
        "يتعهد المستخدم بتصحيح بيانات تسجيله، وبحفظ سرية بيانات دخوله، وباستخدام المنصة لأغراض تعليمية مشروعة فقط، ومنع مشاركة المحتوى مع طرف ثالث دون إذن.",
        "The user must provide accurate registration data, keep login credentials secret, use the platform for legitimate educational purposes only, and refrain from sharing content with third parties without permission.",
      ),
    },
    {
      icon: <Copyright size={20} />,
      title: t("الملكية الفكرية", "Intellectual Property"),
      body: t(
        "جميع الدروس والكتب والأسئلة والمواد المعروضة مملوكة لأكاديمية سراج أو لمصادرها المرخّصة، ولا يجوز نسخها أو إعادة نشرها أو توزيعها تجاريًا دون إذن كتابي مسبق.",
        "All lessons, books, questions, and materials presented are owned by SIRAJ Academy or its licensed sources, and may not be copied, republished, or commercially distributed without prior written permission.",
      ),
    },
    {
      icon: <ShieldAlert size={20} />,
      title: t("المسؤولية", "Liability"),
      body: t(
        "تُقدم المنصة المحتوى التعليمي \"كما هو\" دون ضمانات من أي نوع، ولا تتحمل المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة أو الاعتماد على محتواها.",
        "The platform provides educational content \"as is\" without warranties of any kind, and is not liable for any direct or indirect damages arising from the use of the platform or reliance on its content.",
      ),
    },
    {
      icon: <Ban size={20} />,
      title: t("السلوك المحظور", "Prohibited Conduct"),
      body: t(
        "يُمنع منعاً باتًا محاولة اختراق المنصة، أو نشر محتوى مخالف للشريعة أو للنظام العام، أو انتحال الهوية، أو تعطيل خدمات المنصة للغير.",
        "It is strictly prohibited to attempt to hack the platform, publish content contrary to Islamic law or public order, impersonate others, or disrupt the platform's services for others.",
      ),
    },
    {
      icon: <RefreshCw size={20} />,
      title: t("تعديل الشروط", "Changes to Terms"),
      body: t(
        "يحق لأكاديمية سراج تعديل هذه الشروط في أي وقت، ويسري التعديل فور نشره على هذه الصفحة، ويُعدّ استخدامك المستمر للمنصة قبولًا للشروط المحدّثة.",
        "SIRAJ Academy may amend these terms at any time; amendments take effect upon posting on this page, and your continued use of the platform constitutes acceptance of the updated terms.",
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
            {t("الشروط والأحكام", "Terms of Service")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t(
              "آخر تحديث: أكتوبر 2026 — يرجى قراءة هذه الشروط بعناية قبل استخدام المنصة.",
              "Last updated: October 2026 — please read these terms carefully before using the platform.",
            )}
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">
                {t("مقدمة", "Introduction")}
              </h2>
              <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                {t(
                  "تُنظّم هذه الشروط والأحكام العلاقة بينك وبين أكاديمية سراج بشأن استخدامك للموقع والخدمات التعليمية المقدَّمة عبره.",
                  "These terms govern the relationship between you and SIRAJ Academy regarding your use of the website and the educational services provided through it.",
                )}
              </p>
            </div>
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
                  "لأي استفسار حول هذه الشروط، يرجى التواصل معنا عبر صفحة «اتصل بنا» على الموقع.",
                  "For any questions about these terms, please reach us through the \"Contact\" page.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
