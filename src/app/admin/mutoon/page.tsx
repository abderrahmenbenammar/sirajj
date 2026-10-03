import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, HelpCircle, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import NewMatnQuizForm from "@/components/admin/NewMatnQuizForm";
import type { AdminMatn } from "@/components/admin/types";

// Admin-only list; must render at request time, never at build time.
export const dynamic = "force-dynamic";

export default async function AdminMutoonPage() {
  const { response } = await requireAdmin();
  if (response) redirect("/");

  const rows = await prisma.matn.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { quizzes: true } },
      quizzes: {
        orderBy: { createdAt: "asc" },
        select: { id: true, question: true, correctAnswer: true },
      },
    },
  });

  const mutoon: AdminMatn[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    quizCount: row._count.quizzes,
    quizzes: row.quizzes,
  }));

  return (
    <div>
      <PageHeader
        title="إدارة المتون"
        subtitle="إدارة نصوص الحفظ وأسئلة التسميع"
        actions={
          <Link href="/admin/mutoon/new" className="admin-button inline-flex w-auto items-center gap-1.5 px-4">
            <Plus size={16} />
            إضافة متن جديد
          </Link>
        }
      />

      {mutoon.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
          <BookOpen size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
          <p className="mt-3 font-bold text-gray-900 dark:text-white">لا توجد متون بعد</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            أضف أول متن لبدء بناء اختبارات الحفظ والتسميع
          </p>
          <Link href="/admin/mutoon/new" className="admin-button mx-auto mt-4 inline-flex w-auto items-center gap-1.5 px-5">
            <Plus size={16} />
            إضافة متن جديد
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {mutoon.map((matn) => (
            <section
              key={matn.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">{matn.title}</h2>
                  {matn.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{matn.description}</p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <HelpCircle size={13} />
                  {matn.quizCount} {matn.quizCount === 1 ? "سؤال" : "أسئلة"}
                </span>
              </div>

              {matn.quizzes.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {matn.quizzes.map((quiz, index) => (
                    <li
                      key={quiz.id}
                      className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800"
                    >
                      <p className="font-bold text-gray-900 dark:text-white">
                        <span className="ms-1 text-gray-400">{index + 1}.</span> {quiz.question}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-gray-600 dark:text-gray-300">
                        {quiz.correctAnswer}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <NewMatnQuizForm matnId={matn.id} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
