import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ courseId: string }> };

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId } = await params;
  const body = await request.json();
  // Only provided fields are updated; legacy aliases (title/description/image) still accepted.
  const categoryId = asText(body.categoryId);
  const instructorId = asText(body.instructorId);
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 400 });
  }
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
      categoryId: categoryId ?? undefined,
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
  try {
    // Cascades to lessons/exams/attempts/progress/certificates. If student
    // records reference this course, the database RESTRICT guards refuse it.
    await prisma.course.delete({ where: { id: courseId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "تعذر حذف الدورة — توجد سجلات طلاب مرتبطة بها" },
      { status: 409 }
    );
  }
}
