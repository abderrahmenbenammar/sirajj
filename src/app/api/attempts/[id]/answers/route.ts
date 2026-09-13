import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Autosave one answer (idempotent upsert). Correctness is computed server-side
// but deliberately NOT returned here to avoid leaking feedback mid-exam.
export async function POST(request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: attemptId } = await params;
  if (!UUID_RE.test(attemptId)) return NextResponse.json({ error: "المحاولة غير موجودة" }, { status: 404 });

  const body = await request.json();
  const questionId = asText(body.questionId);
  const selectedOptionId = asText(body.selectedOptionId);
  if (!questionId || !UUID_RE.test(questionId) || !selectedOptionId || !UUID_RE.test(selectedOptionId)) {
    return NextResponse.json({ error: "بيانات الإجابة غير صحيحة" }, { status: 400 });
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, examId: true, studentId: true, status: true },
  });
  if (!attempt || attempt.studentId !== studentId) {
    return NextResponse.json({ error: "المحاولة غير موجودة" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "المحاولة مغلقة ولا تقبل إجابات" }, { status: 409 });
  }

  const question = await prisma.examQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, examId: true },
  });
  if (!question || question.examId !== attempt.examId) {
    return NextResponse.json({ error: "السؤال غير موجود في هذا الاختبار" }, { status: 404 });
  }

  const option = await prisma.examQuestionOption.findUnique({
    where: { id: selectedOptionId },
    select: { id: true, questionId: true, isCorrect: true },
  });
  if (!option || option.questionId !== questionId) {
    return NextResponse.json({ error: "الخيار غير موجود في هذا السؤال" }, { status: 400 });
  }

  await prisma.examAttemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { selectedOptionId, isCorrect: option.isCorrect },
    create: { attemptId, questionId, selectedOptionId, isCorrect: option.isCorrect },
  });

  return NextResponse.json({ success: true });
}
