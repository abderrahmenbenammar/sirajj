import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { examValidity, myExamStats } from "@/lib/exams-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (courseId && !UUID_RE.test(courseId)) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const exams = await prisma.exam.findMany({
    where: courseId ? { courseId } : undefined,
    include: { course: { select: { id: true, titleAr: true, titleEn: true } } },
    orderBy: { createdAt: "desc" },
  });

  const items = await Promise.all(
    exams.map(async (exam) => {
      const validity = await examValidity(exam.id);
      const stats = await myExamStats(exam.id, studentId, exam.maxAttempts);
      if (stats.lastResult) {
        stats.lastResult.passed = stats.lastResult.scorePercentage >= exam.passingScorePercentage;
      }
      return {
        id: exam.id,
        courseId: exam.courseId,
        courseTitleAr: exam.course.titleAr,
        courseTitleEn: exam.course.titleEn,
        titleAr: exam.titleAr,
        titleEn: exam.titleEn,
        passingScorePercentage: exam.passingScorePercentage,
        maxAttempts: exam.maxAttempts,
        questionCount: validity.questionCount,
        available: validity.available,
        ...stats,
      };
    })
  );

  return NextResponse.json(items);
}
