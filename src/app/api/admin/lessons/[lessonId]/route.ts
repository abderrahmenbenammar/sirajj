import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteLessonWithDependencies } from "@/lib/delete-course";
import { asVideoSeconds, resolveLessonVideoDuration } from "@/lib/certificates/videos";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Context = { params: Promise<{ lessonId: string }> };

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { lessonId } = await params;
  if (!UUID_RE.test(lessonId)) return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  const body = await request.json();
  const orderIndex = body.orderIndex ?? body.position;
  // Duration follows the video: a changed videoUrl re-resolves (YouTube via
  // API+cache, hosted via the client-measured length, else null); an
  // explicit videoDurationSeconds always wins when valid.
  const nextVideoUrl = asText(body.videoUrl);
  let videoDurationSeconds: number | null | undefined;
  if ("videoDurationSeconds" in body) {
    const explicit = asVideoSeconds(body.videoDurationSeconds);
    if (explicit === "INVALID") {
      return NextResponse.json({ error: "مدة الفيديو غير صالحة" }, { status: 400 });
    }
    videoDurationSeconds = explicit;
  } else if (nextVideoUrl) {
    const resolved = await resolveLessonVideoDuration(nextVideoUrl, null);
    if (resolved === "INVALID") {
      return NextResponse.json({ error: "مدة الفيديو غير صالحة" }, { status: 400 });
    }
    videoDurationSeconds = resolved;
  }
  try {
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        titleAr: asText(body.titleAr) ?? asText(body.title) ?? undefined,
        titleEn: asText(body.titleEn) ?? undefined,
        orderIndex: Number.isInteger(orderIndex) && orderIndex >= 0 ? orderIndex : undefined,
        videoUrl: nextVideoUrl ?? undefined,
        subtitleUrl: asText(body.subtitleUrl) ?? undefined,
        videoDurationSeconds,
      },
    });
    return NextResponse.json(lesson);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "يوجد درس بنفس الترتيب في هذه الدورة" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { lessonId } = await params;
  if (!UUID_RE.test(lessonId)) return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  const exists = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  try {
    // Exams linked to the lesson are detached (kept as course-level exams, with
    // their attempts/results) and the lesson's own completions go with it. This
    // never touches other lessons, exams, attempts or student progress.
    const result = await prisma.$transaction((tx) => deleteLessonWithDependencies(tx, lessonId));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[admin/lessons/delete] failed", lessonId, error);
    return NextResponse.json({ error: "تعذر حذف الدرس — حاول مرة أخرى" }, { status: 500 });
  }
}
