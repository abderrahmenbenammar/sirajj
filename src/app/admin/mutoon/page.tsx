import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import AdminMatnCard from "@/components/admin/AdminMatnCard";
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
            <AdminMatnCard key={matn.id} matn={matn} />
          ))}
        </div>
      )}
    </div>
  );
}
