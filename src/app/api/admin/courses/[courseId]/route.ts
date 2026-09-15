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

// For PATCH only: distinguish "absent" (don't touch) from "present but empty"
// (clear the nullable field). Returns undefined when the key is missing.
function patchField(body: Record<string, unknown>, key: string): string | null | undefined {
  if (!(key in body)) return undefined;
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  const body = await request.json();

  // Accredited patchable fields — the exact Course columns the admin may edit.
  const updates: Record<string, string | null> = {};

  // Titles: an empty value leaves the existing title untouched (matching the
  // pre-existing partial-update behavior); only non-empty values are written.
  const titleAr = patchField(body, "titleAr");
  if (titleAr !== undefined && titleAr) updates.titleAr = titleAr;
  const titleEn = patchField(body, "titleEn");
  if (titleEn !== undefined && titleEn) updates.titleEn = titleEn;
  // Nullable fields: explicitly send an empty string to clear.
  for (const key of ["shortDescriptionAr", "shortDescriptionEn", "curriculumAr", "curriculumEn"] as const) {
    const value = patchField(body, key);
    if (value !== undefined) updates[key] = value;
  }
  // The admin form never empties this unless a new file was uploaded; an empty
  // value here simply preserves the current image instead of clearing it.
  const coverImageUrl = patchField(body, "coverImageUrl");
  if (coverImageUrl) updates.coverImageUrl = coverImageUrl;
  const path = patchField(body, "path");
  if (path !== undefined) {
    if (!isCoursePath(path)) return NextResponse.json({ error: "مسار غير صالح" }, { status: 400 });
    updates.path = path;
  }
  const instructorId = patchField(body, "instructorId");
  if (instructorId !== undefined) {
    if (instructorId) {
      if (!UUID_RE.test(instructorId)) return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 400 });
      const exists = await prisma.instructor.findUnique({ where: { id: instructorId }, select: { id: true } });
      if (!exists) return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 400 });
    }
    updates.instructorId = instructorId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول قابلة للتعديل" }, { status: 400 });
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: updates,
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