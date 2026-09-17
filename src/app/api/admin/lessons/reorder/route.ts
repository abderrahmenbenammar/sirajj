import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { InvalidLessonOrderError, LessonOrderConflictError, reorderCourseLessons } from "@/lib/lesson-order";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
  const lessonIds: unknown = body.lessonIds;
  if (
    !UUID_RE.test(courseId) ||
    !Array.isArray(lessonIds) ||
    !lessonIds.every((id) => typeof id === "string" && UUID_RE.test(id))
  ) {
    return NextResponse.json({ error: "ترتيب الدروس غير صالح" }, { status: 400 });
  }
  try {
    const lessons = await reorderCourseLessons(courseId, lessonIds as string[]);
    return NextResponse.json({ success: true, lessons });
  } catch (error) {
    if (error instanceof InvalidLessonOrderError) {
      return NextResponse.json({ error: "قائمة الدروس لا تطابق دروس الدورة" }, { status: 400 });
    }
    if (error instanceof LessonOrderConflictError) {
      return NextResponse.json({ error: "تعذر حفظ الترتيب، حاول مرة أخرى" }, { status: 409 });
    }
    console.error("[admin/lessons/reorder] failed", courseId, error);
    return NextResponse.json({ error: "تعذر حفظ الترتيب — حاول مرة أخرى" }, { status: 500 });
  }
}
