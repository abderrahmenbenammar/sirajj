import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const courses = await prisma.course.findMany({ include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { slug, title, description, level, image } = await request.json();
  if (!slug || !title || !["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(level)) {
    return NextResponse.json({ error: "بيانات الدورة غير صحيحة" }, { status: 400 });
  }
  const course = await prisma.course.create({ data: { slug, title, description: description || null, level, image: image || null } });
  return NextResponse.json(course, { status: 201 });
}
