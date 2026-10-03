import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MatnQuizTaker from "@/components/matn/MatnQuizTaker";

export const dynamic = "force-dynamic";

export default async function MatnDetailPage({
  params,
}: {
  params: Promise<{ matnId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  const { matnId } = await params;
  const matn = await prisma.matn.findUnique({
    where: { id: matnId },
    select: {
      id: true,
      title: true,
      description: true,
      quizzes: {
        orderBy: { createdAt: "asc" },
        select: { id: true, question: true, correctAnswer: true },
      },
    },
  });
  if (!matn) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/dashboard/mutoon"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
      >
        <ArrowRight size={16} />
        رجوع إلى المتون
      </Link>

      <div className="mt-3 rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-gray-800/60 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <BookOpen size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {matn.title}
            </h1>
            {matn.description && (
              <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {matn.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-6 text-base font-bold text-gray-900 dark:text-white">
        أسئلة التسميع ({matn.quizzes.length})
      </h2>
      <MatnQuizTaker quizzes={matn.quizzes} />
    </div>
  );
}
