import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPositiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

type QuestionInput = {
  questionTextAr: unknown;
  questionTextEn: unknown;
  points: unknown;
  options: unknown;
};

// Validate the optional full-exam payload. Returns an error string or null.
function validateQuestions(questions: unknown): string | null {
  if (!Array.isArray(questions)) return "بيانات الأسئلة غير صحيحة";
  for (const raw of questions as QuestionInput[]) {
    if (!asText(raw.questionTextAr) || !asText(raw.questionTextEn)) {
      return "نص السؤال بالعربية والإنجليزية مطلوب";
    }
    if (asPositiveInt(raw.points) === null) {
      return "درجات السؤال يجب أن تكون رقمًا صحيحًا أكبر من صفر";
    }
    if (!Array.isArray(raw.options) || raw.options.length < 2) {
      return "كل سؤال يجب أن يحتوي على خيارين على الأقل";
    }
    let correct = 0;
    for (const option of raw.options as { optionTextAr?: unknown; optionTextEn?: unknown; isCorrect?: unknown }[]) {
      if (!asText(option.optionTextAr) || !asText(option.optionTextEn)) {
        return "نص الخيار بالعربية والإنجليزية مطلوب";
      }
      if (option.isCorrect === true) correct += 1;
    }
    if (correct !== 1) return "كل سؤال يجب أن يحتوي على إجابة صحيحة واحدة";
  }
  return null;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const exams = await prisma.exam.findMany({
    include: {
      course: { select: { id: true, titleAr: true } },
      lesson: { select: { id: true, titleAr: true, titleEn: true } },
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
  const pointsSums = await prisma.examQuestion.groupBy({
    by: ["examId"],
    where: { examId: { in: exams.map((exam) => exam.id) } },
    _sum: { points: true },
  });
  const pointsByExam = new Map(pointsSums.map((row) => [row.examId, row._sum.points ?? 0]));
  return NextResponse.json(
    exams.map((exam, index) => ({
      id: exam.id,
      courseId: exam.courseId,
      courseTitleAr: exam.course.titleAr,
      lessonId: exam.lessonId,
      lesson: exam.lesson,
      titleAr: exam.titleAr,
      titleEn: exam.titleEn,
      passingScorePercentage: exam.passingScorePercentage,
      maxAttempts: exam.maxAttempts,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      questionCount: exam._count.questions,
      totalPoints: pointsByExam.get(exam.id) ?? 0,
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
  if (!courseId) {
    return NextResponse.json({ error: "بيانات الاختبار غير صحيحة" }, { status: 400 });
  }
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, titleAr: true, titleEn: true } });
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }
  // The title is required by the schema. It is no longer collected in the UI,
  // so when it's omitted we derive it from the course title + timestamp
  // (explicitly provided titles remain honored, keeping old callers working).
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const titleAr = asText(body.titleAr) ?? `اختبار ${course.titleAr} — ${stamp}`;
  const lessonId = asText(body.lessonId);
  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (!lesson || lesson.courseId !== courseId) {
      return NextResponse.json({ error: "الفيديو المختار لا يتبع هذه الدورة" }, { status: 400 });
    }
    // One exam per lesson: reject creating a second exam for the same lesson.
    const taken = await prisma.exam.findFirst({ where: { lessonId }, select: { id: true } });
    if (taken) {
      return NextResponse.json({ error: "هذا الدرس لديه اختبار بالفعل." }, { status: 409 });
    }
  }
  const passing = body.passingScorePercentage ?? 60;
  const max = body.maxAttempts ?? 3;
  if (!Number.isInteger(passing) || passing < 0 || passing > 100) {
    return NextResponse.json({ error: "درجة النجاح يجب أن تكون بين 0 و 100" }, { status: 400 });
  }
  if (!Number.isInteger(max) || max < 1) {
    return NextResponse.json({ error: "عدد المحاولات يجب أن يكون 1 على الأقل" }, { status: 400 });
  }
  // The Add Exam builder sends the whole exam (data + questions + options) in
  // one request. Legacy callers that only create an empty exam stay supported.
  const hasQuestions = body.questions !== undefined && body.questions !== null;
  if (hasQuestions) {
    const questionsError = validateQuestions(body.questions);
    if (questionsError) return NextResponse.json({ error: questionsError }, { status: 400 });
  }
  const questions = (hasQuestions ? body.questions : []) as QuestionInput[];
  let exam;
  try {
    exam = await prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          courseId,
          lessonId,
          titleAr,
          titleEn: asText(body.titleEn) ?? titleAr,
          passingScorePercentage: passing,
          maxAttempts: max,
        },
      });
      for (const [index, raw] of questions.entries()) {
        const question = await tx.examQuestion.create({
          data: {
            examId: created.id,
            questionTextAr: asText(raw.questionTextAr) as string,
            questionTextEn: asText(raw.questionTextEn) as string,
            points: asPositiveInt(raw.points) as number,
            orderIndex: index,
          },
        });
        await tx.examQuestionOption.createMany({
          data: (raw.options as { optionTextAr?: unknown; optionTextEn?: unknown; isCorrect?: unknown }[]).map((option) => ({
            questionId: question.id,
            optionTextAr: asText(option.optionTextAr) as string,
            optionTextEn: asText(option.optionTextEn) as string,
            isCorrect: option.isCorrect === true,
          })),
        });
      }
      return created;
    });
  } catch (error) {
    // Race safety: two concurrent creates for the same lesson hit the DB
    // unique constraint; report it as a conflict, not a server error.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "هذا الدرس لديه اختبار بالفعل." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json(exam, { status: 201 });
}
