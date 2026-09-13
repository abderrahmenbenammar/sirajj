import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const exams = await prisma.exam.findMany({
    include: {
      course: { select: { id: true, titleAr: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // Validity (no published flag in schema): every question must have a correct option.
  const invalidCounts = await Promise.all(
    exams.map((exam) =>
      prisma.examQuestion.count({ where: { examId: exam.id, options: { none: { isCorrect: true } } } })
    )
  );
  return NextResponse.json(
    exams.map((exam, index) => ({
      id: exam.id,
      courseId: exam.courseId,
      courseTitleAr: exam.course.titleAr,
      titleAr: exam.titleAr,
      titleEn: exam.titleEn,
      passingScorePercentage: exam.passingScorePercentage,
      maxAttempts: exam.maxAttempts,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      questionCount: exam._count.questions,
      attemptCount: exam._count.attempts,
      invalidQuestions: invalidCounts[index],
      available: exam._count.questions > 0 && invalidCounts[index] === 0,
    }))
  );
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  const courseId = asText(body.courseId);
  const titleAr = asText(body.titleAr);
  if (!courseId || !titleAr) {
    return NextResponse.json({ error: "بيانات الاختبار غير صحيحة" }, { status: 400 });
  }
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }
  const passing = body.passingScorePercentage ?? 60;
  const max = body.maxAttempts ?? 3;
  if (!Number.isInteger(passing) || passing < 0 || passing > 100) {
    return NextResponse.json({ error: "درجة النجاح يجب أن تكون بين 0 و 100" }, { status: 400 });
  }
  if (!Number.isInteger(max) || max < 1) {
    return NextResponse.json({ error: "عدد المحاولات يجب أن يكون 1 على الأقل" }, { status: 400 });
  }
  const exam = await prisma.exam.create({
    data: {
      courseId,
      titleAr,
      titleEn: asText(body.titleEn) ?? titleAr,
      passingScorePercentage: passing,
      maxAttempts: max,
    },
  });
  return NextResponse.json(exam, { status: 201 });
}
