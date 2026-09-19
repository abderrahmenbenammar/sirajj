import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureCertificate } from "@/lib/certificates-server";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: lessonId } = await params;
  if (!UUID_RE.test(lessonId)) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, courseId: true } });
  if (!lesson) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }

  // NOTE: the request body (if any) is intentionally ignored. The student is
  // always taken from the server session, so a forged userId can never
  // record progress for another user.
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.lessonCompletion.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
      select: { id: true },
    });
    if (!existing) {
      await tx.lessonCompletion.create({ data: { studentId, lessonId } });
    }

    const [totalLessons, doneLessons, previous] = await Promise.all([
      tx.lesson.count({ where: { courseId: lesson.courseId } }),
      tx.lessonCompletion.count({ where: { studentId, lesson: { courseId: lesson.courseId } } }),
      tx.studentCourseProgress.findUnique({
        where: { studentId_courseId: { studentId, courseId: lesson.courseId } },
        select: { completedAt: true },
      }),
    ]);

    const progress = totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 10000) / 100;
    const completed = totalLessons > 0 && doneLessons >= totalLessons;
    const completedAt = completed ? (previous?.completedAt ?? new Date()) : null;

    await tx.studentCourseProgress.upsert({
      where: { studentId_courseId: { studentId, courseId: lesson.courseId } },
      update: {
        completionPercentage: progress,
        status: completed ? "completed" : "in_progress",
        completedAt,
      },
      create: {
        studentId,
        courseId: lesson.courseId,
        completionPercentage: progress,
        status: completed ? "completed" : "in_progress",
        completedAt,
      },
    });

    return { alreadyCompleted: existing !== null, progress, doneLessons, totalLessons };
  });

  // Auto-issue when finishing the last lesson completes eligibility (the exam
  // may already be passed). Isolated: a certificate failure must never break
  // progress tracking — it only logs server-side.
  if (result.totalLessons > 0 && result.doneLessons >= result.totalLessons) {
    try {
      await ensureCertificate(studentId, lesson.courseId);
    } catch (error) {
      console.error("[certificates/auto-issue] complete hook failed", studentId, lesson.courseId, error);
    }
  }

  return NextResponse.json({ success: true, completed: true, ...result });
}
