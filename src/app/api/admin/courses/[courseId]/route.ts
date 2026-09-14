import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteCourseWithDependencies } from "@/lib/delete-course";
import { isCoursePath } from "@/lib/course-paths";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Context = { params: Promise<{ courseId: string }> };

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  const body = await request.json();
  // Only provided fields are updated; legacy aliases (title/description/image) still accepted.
  const path = asText(body.path);
  if (path !== null && !isCoursePath(path)) {
    return NextResponse.json({ error: "مسار غير صالح" }, { status: 400 });
  }
  const instructorId = asText(body.instructorId);
  if (instructorId && !(await prisma.instructor.findUnique({ where: { id: instructorId }, select: { id: true } }))) {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 400 });
  }
  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      titleAr: asText(body.titleAr) ?? asText(body.title) ?? undefined,
      titleEn: asText(body.titleEn) ?? undefined,
      shortDescriptionAr: asText(body.shortDescriptionAr) ?? asText(body.description) ?? undefined,
      shortDescriptionEn: asText(body.shortDescriptionEn) ?? undefined,
      path: path ?? undefined,
      instructorId: instructorId ?? undefined,
      coverImageUrl: asText(body.coverImageUrl) ?? asText(body.image) ?? undefined,
    },
  });
  return NextResponse.json(course);
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, titleAr: true },
  });
  if (!course) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });

  // Cascades to lessons/resources/exams/questions/options/attempts/
  // completions/progress/certificates. Student attempt answers are removed
  // explicitly first because their question/option FKs are RESTRICT, even
  // though the schema cascades them via the attempt FK (see delete-course.ts).
  try {
    await prisma.$transaction(async (tx) => {
      await deleteCourseWithDependencies(tx, courseId);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/courses/delete] failed", courseId, error);
    return NextResponse.json(
      { error: "تعذر حذف الدورة بسبب خطأ في قاعدة البيانات — راجع سجلات الخادم" },
      { status: 500 }
    );
  }
}