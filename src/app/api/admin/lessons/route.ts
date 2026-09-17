import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLessonWithNextOrder, LessonOrderConflictError } from "@/lib/lesson-order";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  // Canonical v2: titleAr/titleEn; legacy `title` accepted as an alias.
  const courseId = asText(body.courseId);
  const titleAr = asText(body.titleAr) ?? asText(body.title);
  const videoUrl = asText(body.videoUrl);
  if (!courseId || !titleAr || !videoUrl) {
    return NextResponse.json({ error: "بيانات الدرس غير صحيحة" }, { status: 400 });
  }
  try {
    const lesson = await createLessonWithNextOrder({
      courseId,
      titleAr,
      titleEn: asText(body.titleEn) ?? titleAr,
      videoUrl,
      subtitleUrl: asText(body.subtitleUrl),
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    if (error instanceof LessonOrderConflictError) {
      return NextResponse.json({ error: "تعذر تحديد ترتيب الدرس، حاول مرة أخرى" }, { status: 409 });
    }
    throw error;
  }
}
