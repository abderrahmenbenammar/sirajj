import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  // v2 quizzes live under exams: creates one ExamQuestion with its options atomically.
  // Legacy `question` accepted as alias for questionAr.
  const body = await request.json();
  const examId = asText(body.examId);
  const questionAr = asText(body.questionAr) ?? asText(body.question);
  const options: unknown = body.options;
  const correctIndex: unknown = body.correctIndex;
  if (
    !examId ||
    !questionAr ||
    !Array.isArray(options) ||
    options.length < 2 ||
    options.some((option) => typeof option !== "string" || !option.trim()) ||
    !Number.isInteger(correctIndex) ||
    (correctIndex as number) < 0 ||
    (correctIndex as number) >= options.length
  ) {
    return NextResponse.json({ error: "بيانات الاختبار غير صحيحة" }, { status: 400 });
  }
  if (!(await prisma.exam.findUnique({ where: { id: examId }, select: { id: true } }))) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }
  try {
    const orderIndex = await prisma.examQuestion.count({ where: { examId } });
    const created = await prisma.$transaction(async (tx) => {
      const question = await tx.examQuestion.create({
        data: { examId, questionTextAr: questionAr, questionTextEn: asText(body.questionEn) ?? questionAr, orderIndex },
      });
      await tx.examQuestionOption.createMany({
        data: (options as string[]).map((option, index) => ({
          questionId: question.id,
          optionTextAr: option.trim(),
          optionTextEn: option.trim(),
          isCorrect: index === correctIndex,
        })),
      });
      return tx.examQuestion.findUnique({ where: { id: question.id }, include: { options: true } });
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "يوجد سؤال بنفس الترتيب في هذا الاختبار" }, { status: 409 });
    }
    throw error;
  }
}
