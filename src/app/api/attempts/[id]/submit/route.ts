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
  totalPoints: number,
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
    totalPoints,
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
    const questions = await prisma.examQuestion.findMany({
      where: { examId: existing.examId },
      select: { points: true },
    });
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
    return NextResponse.json({
      alreadySubmitted: true,
      ...buildResult(
        existing,
        existing.exam,
        Math.round(Number(existing.score)),
        questions.length,
        totalPoints,
        stats.attemptsUsed
      ),
    });
  }

  const graded = await prisma.$transaction(async (tx) => {
    const questions = await tx.examQuestion.findMany({
      where: { examId: existing.examId },
      select: { id: true, points: true },
    });
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
    const totalQuestions = questions.length;
    const answers = await tx.examAttemptAnswer.findMany({
      where: { attemptId },
      include: { selectedOption: { select: { isCorrect: true } } },
    });

    // Recompute correctness from the current key (truthful even if options
    // changed mid-attempt) and persist it for weak-point analytics. The exam
    // score is the sum of the points of the correctly answered questions.
    let correctCount = 0;
    let earnedPoints = 0;
    const pointsById = new Map(questions.map((question) => [question.id, question.points]));
    for (const answer of answers) {
      const correct = answer.selectedOption.isCorrect;
      if (correct) {
        correctCount += 1;
        earnedPoints += pointsById.get(answer.questionId) ?? 1;
      }
      if (answer.isCorrect !== correct) {
        await tx.examAttemptAnswer.update({ where: { id: answer.id }, data: { isCorrect: correct } });
      }
    }
    const scorePercentage = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 10000) / 100;

    // Guarded close: only one submitter wins; concurrent re-submits see count 0.
    const closed = await tx.examAttempt.updateMany({
      where: { id: attemptId, studentId, status: "in_progress" },
      data: {
        score: earnedPoints,
        scorePercentage,
        status: "completed",
        submittedAt: new Date(),
      },
    });
    if (closed.count === 0) {
      const current = await tx.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      return {
        alreadySubmitted: true,
        final: current,
        correctCount: Math.round(Number(current.score)),
        totalQuestions,
        totalPoints,
      };
    }
    const final = await tx.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    return { alreadySubmitted: false, final, correctCount, totalQuestions, totalPoints };
  });

  // Attempt counter is read after the transaction commits so the just-finished
  // attempt is included in attemptsUsed/attemptsLeft on the first response too.
  const attemptedStats = await myExamStats(existing.examId, studentId, existing.exam.maxAttempts);
  return NextResponse.json({
    success: true,
    ...buildResult(graded.final, existing.exam, graded.correctCount, graded.totalQuestions, graded.totalPoints, attemptedStats.attemptsUsed),
    alreadySubmitted: graded.alreadySubmitted,
  });
}
