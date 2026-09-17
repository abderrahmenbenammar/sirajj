import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildExamDetail } from "@/lib/exams-server";
import { loadCourseGate } from "@/lib/lesson-gate";

type Context = { params: Promise<{ id: string; lessonId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Gated lesson content. This is the only endpoint that returns a lesson's
// video, and it enforces the exam gate server-side for every caller —
// anonymous or signed in. Opening the next lesson by URL/API cannot bypass it.
export async function GET(_request: Request, { params }: Context) {
  const { id: courseId, lessonId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(lessonId)) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, titleAr: true, titleEn: true, orderIndex: true, videoUrl: true },
  });
  if (!lesson || lesson.courseId !== courseId) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, titleAr: true, titleEn: true },
  });
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const session = await auth();
  const studentId = session?.user?.id ?? null;
  const gate = await loadCourseGate(studentId, courseId);

  if (gate.lockedLessonIds.has(lessonId)) {
    const index = gate.lessons.findIndex((entry) => entry.id === lessonId);
    // The blocker to send the student back to is the *earliest* earlier lesson
    // whose required exam is still unmet: locks are cumulative, so that is the
    // next gate they must clear before any later lesson becomes reachable.
    const blocker =
      (index > 0
        ? gate.lessons
            .slice(0, index)
            .find((entry) => gate.gatedLessonIds.has(entry.id) && !gate.clearedLessonIds.has(entry.id))
        : null) ?? null;
    const requiredExam = blocker
      ? (gate.examsByLesson.get(blocker.id) ?? []).find((exam) => exam.available) ?? null
      : null;
    return NextResponse.json(
      {
        error: "يجب اجتياز اختبار الدرس السابق أولًا",
        locked: true,
        requiredLesson: blocker ? { id: blocker.id, titleAr: blocker.titleAr, titleEn: blocker.titleEn } : null,
        requiredExam: requiredExam ? { id: requiredExam.id, titleAr: requiredExam.titleAr, titleEn: requiredExam.titleEn } : null,
      },
      { status: 403 }
    );
  }

  const linkedExams = gate.examsByLesson.get(lessonId) ?? [];
  const exams = await Promise.all(linkedExams.map((exam) => buildExamDetail(exam.id, studentId)));

  return NextResponse.json({
    course,
    lesson: {
      id: lesson.id,
      titleAr: lesson.titleAr,
      titleEn: lesson.titleEn,
      orderIndex: lesson.orderIndex,
      videoUrl: lesson.videoUrl,
    },
    // examPassed means "this lesson's own gate is satisfied", so the next
    // lesson is reachable (when the exam list is empty it is trivially true).
    examPassed: gate.clearedLessonIds.has(lessonId),
    exams: exams.filter((exam) => exam !== null),
  });
}
