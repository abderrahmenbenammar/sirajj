import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const courses = await prisma.course.findMany({ include: { lessons: { orderBy: { orderIndex: "asc" } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(courses);
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  // Canonical v2 fields (titleAr/titleEn/...); legacy `title`/`description`/`image` accepted as aliases.
  const titleAr = asText(body.titleAr) ?? asText(body.title);
  if (!titleAr) {
    return NextResponse.json({ error: "بيانات الدورة غير صحيحة" }, { status: 400 });
  }
  const categoryId = asText(body.categoryId);
  const instructorId = asText(body.instructorId);
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 400 });
  }
  if (instructorId && !(await prisma.instructor.findUnique({ where: { id: instructorId }, select: { id: true } }))) {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 400 });
  }
  const course = await prisma.course.create({
    data: {
      titleAr,
      titleEn: asText(body.titleEn) ?? titleAr,
      shortDescriptionAr: asText(body.shortDescriptionAr) ?? asText(body.description),
      shortDescriptionEn: asText(body.shortDescriptionEn) ?? asText(body.description),
      categoryId,
      instructorId,
      coverImageUrl: asText(body.coverImageUrl) ?? asText(body.image),
    },
  });
  return NextResponse.json(course, { status: 201 });
}
