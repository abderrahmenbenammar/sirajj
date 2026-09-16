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
  // Legacy `question` accepted as alias for questionAr; legacy string[] options +
  // correctIndex are still accepted. The richer payload uses bilingual option
  // objects with an explicit `isCorrect` flag plus per-question `points`.
  const body = await request.json();
  const examId = asText(body.examId);
  const questionAr = asText(body.questionAr) ?? asText(body.question);
  const questionEn = asText(body.questionEn) ?? questionAr;
  const points = body.points === undefined ? 1 : body.points;
  const rawOptions: unknown = body.options;
  const correctIndex: unknown = body.correctIndex;

  if (!examId || !questionAr || !Array.isArray(rawOptions) || rawOptions.length < 2) {
    return NextResponse.json({ error: "بيانات الاختبار غير صحيحة" }, { status: 400 });
  }
  if (!Number.isInteger(points) || (points as number) < 1) {
    return NextResponse.json({ error: "درجات السؤال يجب أن تكون رقمًا صحيحًا أكبر من صفر" }, { status: 400 });
  }

  type ResolvedOption = { optionTextAr: string; optionTextEn: string; isCorrect: boolean };
  let options: ResolvedOption[];
  if (rawOptions.every((option) => typeof option === "string")) {
    if (
      !Number.isInteger(correctIndex) ||
      (correctIndex as number) < 0 ||
      (correctIndex as number) >= rawOptions.length
    ) {
      return NextResponse.json({ error: "بيانات الاختبار غير صحيحة" }, { status: 400 });
    }
    options = (rawOptions as string[]).map((option, index) => ({
      optionTextAr: option.trim(),
      optionTextEn: option.trim(),
      isCorrect: index === correctIndex,
    }));
  } else {
    const resolved = (rawOptions as { optionTextAr?: unknown; optionTextEn?: unknown; isCorrect?: unknown }[]).map(
      (option) => ({
        optionTextAr: asText(option.optionTextAr),
        optionTextEn: asText(option.optionTextEn),
        isCorrect: option.isCorrect === true,
      })
    );
    if (resolved.some((option) => !option.optionTextAr || !option.optionTextEn)) {
      return NextResponse.json({ error: "نص الخيار بالعربية والإنجليزية مطلوب" }, { status: 400 });
    }
    if (resolved.filter((option) => option.isCorrect).length !== 1) {
      return NextResponse.json({ error: "كل سؤال يجب أن يحتوي على إجابة صحيحة واحدة" }, { status: 400 });
    }
    options = resolved as ResolvedOption[];
  }

  if (!(await prisma.exam.findUnique({ where: { id: examId }, select: { id: true } }))) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }
  try {
    const orderIndex = await prisma.examQuestion.count({ where: { examId } });
    const created = await prisma.$transaction(async (tx) => {
      const question = await tx.examQuestion.create({
        data: { examId, questionTextAr: questionAr, questionTextEn: questionEn as string, points: points as number, orderIndex },
      });
      await tx.examQuestionOption.createMany({
        data: options.map((option) => ({
          questionId: question.id,
          optionTextAr: option.optionTextAr,
          optionTextEn: option.optionTextEn,
          isCorrect: option.isCorrect,
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
