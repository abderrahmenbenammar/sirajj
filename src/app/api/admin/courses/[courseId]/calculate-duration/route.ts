import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ courseId: string }> };

// Sum of Lesson.videoDurationSeconds (NULL = unknown, counted as 0) saved to
// Course.durationSeconds. A zero total is stored as NULL ("unspecified"),
// matching the manual-duration convention (0 is meaningless).
export async function POST(_request: Request, context: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  try {
    const { courseId } = await context.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
    }

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      select: { videoDurationSeconds: true },
    });
    const knownDurations = lessons.flatMap((lesson) =>
      typeof lesson.videoDurationSeconds === "number" ? [lesson.videoDurationSeconds] : []
    );
    const totalSeconds = knownDurations.reduce((sum, seconds) => sum + seconds, 0);
    const durationSeconds = totalSeconds > 0 ? totalSeconds : null;

    await prisma.course.update({
      where: { id: courseId },
      data: { durationSeconds },
    });

    return NextResponse.json({
      courseId,
      totalSeconds,
      durationSeconds,
      lessonsCount: lessons.length,
      knownCount: knownDurations.length,
    });
  } catch (error) {
    console.error("[admin/calculate-duration]", error);
    const message = error instanceof Error ? error.message : null;
    return NextResponse.json({ error: message || "تعذر حساب مدة الدورة" }, { status: 500 });
  }
}
