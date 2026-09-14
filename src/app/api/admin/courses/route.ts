import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isCoursePath } from "@/lib/course-paths";

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
  const path = asText(body.path);
  if (!isCoursePath(path)) {
    return NextResponse.json({ error: "المسار مطلوب (BEGINNER أو INTERMEDIATE أو ADVANCED)" }, { status: 400 });
  }
  const instructorId = asText(body.instructorId);
  if (instructorId && !(await prisma.instructor.findUnique({ where: { id: instructorId }, select: { id: true } }))) {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 400 });
  }
  const course = await prisma.course.create({
    data: {
      titleAr,
      titleEn: asText(body.titleEn) ?? titleAr,
      shortDescriptionAr: asText(body.shortDescriptionAr) ?? asText(body.description),
      shortDescriptionEn: asText(body.shortDescriptionEn) ?? asText(body.description),
      path,
      instructorId,
      coverImageUrl: asText(body.coverImageUrl) ?? asText(body.image),
    },
  });
  return NextResponse.json(course, { status: 201 });
}