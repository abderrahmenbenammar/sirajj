import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { myExamStats } from "@/lib/exams-server";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildResult(
  attempt: { id: string; examId: string; attemptNumber: number; score: unknown; scorePercentage: unknown },
  exam: { passingScorePercentage: number; maxAttempts: number },
  correctCount: number,
  totalQuestions: number,
  attemptsUsed: number
) {
  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    attemptNumber: attempt.attemptNumber,
    score: Number(attempt.score),
    scorePercentage: Number(attempt.scorePercentage),
    passed: Number(attempt.scorePercentage) >= exam.passingScorePercentage,
    correctCount,
    totalQuestions,
    attemptsUsed,
    attemptsLeft: Math.max(0, exam.maxAttempts - attemptsUsed),
    submitted: true as const,
  };
}

// Grade + close the attempt atomically. Score is always computed server-side
// from the current answer key — never trusted from the client. Re-submits
// return the stored result instead of creating duplicates.
export async function POST(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: attemptId } = await params;
  if (!UUID_RE.test(attemptId)) return NextResponse.json({ error: "المحاولة غير موجودة" }, { status: 404 });

  const existing = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true },
  });
  if (!existing || existing.studentId !== studentId) {
    return NextResponse.json({ error: "المحاولة غير موجودة" }, { status: 404 });
  }
  if (existing.status !== "in_progress") {
    const stats = await myExamStats(existing.examId, studentId, existing.exam.maxAttempts);
    return NextResponse.json({
      alreadySubmitted: true,
      ...buildResult(
        existing,
        existing.exam,
        Math.round(Number(existing.score)),
        0,
        stats.attemptsUsed
      ),
      totalQuestions: await prisma.examQuestion.count({ where: { examId: existing.examId } }),
    });
  }

  const graded = await prisma.$transaction(async (tx) => {
    const answers = await tx.examAttemptAnswer.findMany({
      where: { attemptId },
      include: { selectedOption: { select: { isCorrect: true } } },
    });
    const totalQuestions = await tx.examQuestion.count({ where: { examId: existing.examId } });

    // Recompute correctness from the current key (truthful even if options
    // changed mid-attempt) and persist it for weak-point analytics.
    let correctCount = 0;
    for (const answer of answers) {
      const correct = answer.selectedOption.isCorrect;
      if (correct) correctCount += 1;
      if (answer.isCorrect !== correct) {
        await tx.examAttemptAnswer.update({ where: { id: answer.id }, data: { isCorrect: correct } });
      }
    }
    const scorePercentage = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 10000) / 100;

    // Guarded close: only one submitter wins; concurrent re-submits see count 0.
    const closed = await tx.examAttempt.updateMany({
      where: { id: attemptId, studentId, status: "in_progress" },
      data: {
        score: correctCount,
        scorePercentage,
        status: "completed",
        submittedAt: new Date(),
      },
    });
    if (closed.count === 0) {
      const current = await tx.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      const stats = await myExamStats(existing.examId, studentId, existing.exam.maxAttempts);
      return {
        alreadySubmitted: true,
        ...buildResult(current, existing.exam, Math.round(Number(current.score)), totalQuestions, stats.attemptsUsed),
      };
    }
    const stats = await myExamStats(existing.examId, studentId, existing.exam.maxAttempts);
    const final = await tx.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    return {
      alreadySubmitted: false,
      ...buildResult(final, existing.exam, correctCount, totalQuestions, stats.attemptsUsed),
    };
  });

  return NextResponse.json({ success: true, ...graded });
}
