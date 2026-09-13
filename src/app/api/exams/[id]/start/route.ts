import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { examValidity, myExamStats, safeQuestions, myAnswersMap } from "@/lib/exams-server";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const validity = await examValidity(exam.id);
  if (!validity.available) {
    return NextResponse.json({ error: "الاختبار غير متاح حاليًا" }, { status: 409 });
  }

  const stats = await myExamStats(exam.id, studentId, exam.maxAttempts);

  // Idempotent resume: one in-progress attempt at a time, never duplicated.
  if (stats.inProgressAttemptId) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: stats.inProgressAttemptId } });
    if (attempt && attempt.studentId === studentId && attempt.status === "in_progress") {
      return NextResponse.json({
        resumed: true,
        attempt: {
          id: attempt.id,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          startedAt: attempt.startedAt,
        },
        questions: await safeQuestions(exam.id),
        answers: await myAnswersMap(attempt.id),
        attemptsUsed: stats.attemptsUsed,
        attemptsLeft: stats.attemptsLeft,
      });
    }
  }

  if (stats.attemptsUsed >= exam.maxAttempts) {
    return NextResponse.json({ error: "استنفدت عدد المحاولات المسموح" }, { status: 409 });
  }

  const attemptNumber =
    (await prisma.examAttempt.count({ where: { examId: exam.id, studentId } })) + 1;
  const attempt = await prisma.examAttempt.create({
    data: { examId: exam.id, studentId, attemptNumber },
  });

  return NextResponse.json(
    {
      resumed: false,
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
      },
      questions: await safeQuestions(exam.id),
      answers: {},
      attemptsUsed: stats.attemptsUsed,
      attemptsLeft: stats.attemptsLeft,
    },
    { status: 201 }
  );
}
