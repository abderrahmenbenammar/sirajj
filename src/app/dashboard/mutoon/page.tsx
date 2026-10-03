import Link from "next/link";
import { BookOpen, HelpCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MutoonPage() {
  const mutoon = await prisma.matn.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      _count: { select: { quizzes: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
          الحفظ والتسميع
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          اختر متنًا من المتون ثم سمّع مقاطعه وصحح حفظك بالذكاء الاصطناعي
        </p>
      </div>

      {mutoon.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/60 bg-white p-10 text-center dark:border-gray-800/60 dark:bg-gray-900">
          <BookOpen size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
          <p className="mt-3 font-bold text-gray-900 dark:text-white">لا توجد متون متاحة بعد</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            عد لاحقًا، سيضيف المشرف نصوص الحفظ قريبًا
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mutoon.map((matn) => (
            <Link
              key={matn.id}
              href={`/dashboard/mutoon/${matn.id}`}
              className="group flex flex-col rounded-2xl border border-gray-200/60 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:border-gray-800/60 dark:bg-gray-900 dark:hover:border-emerald-800"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300">
                <BookOpen size={22} />
              </span>
              <span className="mt-3 block text-base font-bold text-gray-900 dark:text-white">
                {matn.title}
              </span>
              {matn.description && (
                <span className="mt-1 line-clamp-2 block text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {matn.description}
                </span>
              )}
              <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <HelpCircle size={13} />
                {matn._count.quizzes} {matn._count.quizzes === 1 ? "سؤال" : "أسئلة"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
