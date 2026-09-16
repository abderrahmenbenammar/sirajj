import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { examValidity, myExamStats } from "@/lib/exams-server";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { course: { select: { id: true, titleAr: true, titleEn: true } } },
  });
  if (!exam) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const validity = await examValidity(exam.id);
  const stats = await myExamStats(exam.id, studentId, exam.maxAttempts);
  if (stats.lastResult) {
    stats.lastResult.passed = stats.lastResult.scorePercentage >= exam.passingScorePercentage;
  }
  const history = await prisma.examAttempt.findMany({
    where: { examId: exam.id, studentId, status: "completed" },
    orderBy: { attemptNumber: "desc" },
  });
  const questionsAggregate = await prisma.examQuestion.aggregate({
    where: { examId: exam.id },
    _count: true,
    _sum: { points: true },
  });

  return NextResponse.json({
    id: exam.id,
    courseId: exam.courseId,
    courseTitleAr: exam.course.titleAr,
    courseTitleEn: exam.course.titleEn,
    titleAr: exam.titleAr,
    titleEn: exam.titleEn,
    passingScorePercentage: exam.passingScorePercentage,
    maxAttempts: exam.maxAttempts,
    questionCount: validity.questionCount,
    totalPoints: questionsAggregate._sum.points ?? 0,
    available: validity.available,
    ...stats,
    history: history.map((attempt) => ({
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      score: Number(attempt.score),
      scorePercentage: Number(attempt.scorePercentage),
      passed: Number(attempt.scorePercentage) >= exam.passingScorePercentage,
      submittedAt: attempt.submittedAt,
    })),
  });
}
