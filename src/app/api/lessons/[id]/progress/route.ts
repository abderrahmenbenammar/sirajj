import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RESUME_SECONDS = 24 * 60 * 60;

export async function PATCH(request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: lessonId } = await params;
  if (!UUID_RE.test(lessonId)) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { resumeSeconds } = body as { resumeSeconds?: unknown };
  if (typeof resumeSeconds !== "number" || !Number.isFinite(resumeSeconds) || resumeSeconds < 0) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const seconds = Math.min(Math.floor(resumeSeconds), MAX_RESUME_SECONDS);
  await prisma.studentLessonProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    update: { resumeSeconds: seconds },
    create: { studentId, lessonId, resumeSeconds: seconds },
  });

  return NextResponse.json({ success: true, resumeSeconds: seconds });
}
