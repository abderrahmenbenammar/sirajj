import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { myExamStats, safeQuestions, myAnswersMap } from "@/lib/exams-server";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Own attempt detail: questions without keys, own selected options, and — only
// after submit — own per-question correctness (weak points) plus aggregates.
export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: attemptId } = await params;
  if (!UUID_RE.test(attemptId)) return NextResponse.json({ error: "المحاولة غير موجودة" }, { status: 404 });

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true },
  });
  if (!attempt || attempt.studentId !== studentId) {
    return NextResponse.json({ error: "المحاولة غير موجودة" }, { status: 404 });
  }

  const stats = await myExamStats(attempt.examId, studentId, attempt.exam.maxAttempts);
  const questions = await safeQuestions(attempt.examId);
  const answers = await myAnswersMap(attempt.id);

  let review: { questionId: string; questionTextAr: string; questionTextEn: string; selectedOptionId: string; isCorrect: boolean }[] | null = null;
  if (attempt.status === "completed") {
    const rows = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: attempt.id },
      include: { question: { select: { id: true, questionTextAr: true, questionTextEn: true } } },
    });
    review = rows.map((row) => ({
      questionId: row.question.id,
      questionTextAr: row.question.questionTextAr,
      questionTextEn: row.question.questionTextEn,
      selectedOptionId: row.selectedOptionId,
      isCorrect: row.isCorrect,
    }));
  }

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      score: Number(attempt.score),
      scorePercentage: Number(attempt.scorePercentage),
      passed:
        attempt.status === "completed"
          ? Number(attempt.scorePercentage) >= attempt.exam.passingScorePercentage
          : null,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
    },
    exam: {
      id: attempt.exam.id,
      titleAr: attempt.exam.titleAr,
      titleEn: attempt.exam.titleEn,
      passingScorePercentage: attempt.exam.passingScorePercentage,
      maxAttempts: attempt.exam.maxAttempts,
      courseId: attempt.exam.courseId,
    },
    questions,
    answers,
    review,
    attemptsUsed: stats.attemptsUsed,
    attemptsLeft: stats.attemptsLeft,
  });
}
