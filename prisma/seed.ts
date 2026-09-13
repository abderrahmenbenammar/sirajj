import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// بيانات مرجعية فقط — لا دورات تجريبية ولا مستخدمون ولا نقل من dev.db
const categories = [
  { slug: "aqeedah", nameAr: "عقيدة", nameEn: "Aqeedah" },
  { slug: "fiqh", nameAr: "فقه", nameEn: "Fiqh" },
  { slug: "hadith", nameAr: "حديث", nameEn: "Hadith" },
  { slug: "tafsir", nameAr: "تفسير", nameEn: "Tafsir" },
  { slug: "seerah", nameAr: "سيرة", nameEn: "Seerah" },
  { slug: "usul-al-fiqh", nameAr: "أصول فقه", nameEn: "Usul al-Fiqh" },
  { slug: "quran-sciences", nameAr: "علوم قرآن", nameEn: "Quranic Sciences" },
];

const faqs = [
  {
    category: "general",
    orderIndex: 1,
    questionAr: "هل منصة سراج مجانية بالكامل؟",
    questionEn: "Is Siraj completely free?",
    answerAr:
      "نعم، جميع الدورات والمكتبة والاختبارات والشهادات مجانية بالكامل، ولا توجد أي رسوم أو اشتراكات.",
    answerEn:
      "Yes — all courses, library, exams and certificates are completely free, with no fees or subscriptions.",
  },
  {
    category: "general",
    orderIndex: 2,
    questionAr: "كيف أحصل على شهادة؟",
    questionEn: "How do I earn a certificate?",
    answerAr:
      "أكمل دروس الدورة واجتز اختباراتها، ثم تُصدر شهادتك برمز تحقق فريد يمكن مشاركته.",
    answerEn:
      "Complete the course lessons and pass its exams, then your certificate is issued with a unique verification code you can share.",
  },
  {
    category: "general",
    orderIndex: 3,
    questionAr: "كيف أبدّل لغة المنصة؟",
    questionEn: "How do I switch the platform language?",
    answerAr:
      "العربية هي اللغة الافتراضية (RTL)، ويمكنك التبديل إلى الإنجليزية (LTR) من الإعدادات في أي وقت.",
    answerEn:
      "Arabic (RTL) is the default; you can switch to English (LTR) from settings at any time.",
  },
  {
    category: "general",
    orderIndex: 4,
    questionAr: "هل المساعدة الذكية تُفتي في المسائل الشرعية؟",
    questionEn: "Does the AI assistant issue religious rulings?",
    answerAr:
      "لا، دورها يقتصر على توجيه تعلمك واقتراح ما يناسبك بناءً على تقدمك ونقاط ضعفك فقط، وليست مصدرًا للفتوى.",
    answerEn:
      "No — it only guides your learning and suggests what suits you based on your progress and weak points; it is not a source of fatwas.",
  },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameAr: c.nameAr, nameEn: c.nameEn },
      create: c,
    });
  }
  console.log(`seeded ${categories.length} categories`);

  const faqCount = await prisma.faq.count();
  if (faqCount === 0) {
    await prisma.faq.createMany({ data: faqs });
    console.log(`seeded ${faqs.length} faqs`);
  } else {
    console.log(`faqs already present (${faqCount}), skipped`);
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
