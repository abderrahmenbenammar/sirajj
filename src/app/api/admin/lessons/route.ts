import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId, title, position, videoUrl } = await request.json();
  if (!courseId || !title || !Number.isInteger(position) || position < 1) {
    return NextResponse.json({ error: "بيانات الدرس غير صحيحة" }, { status: 400 });
  }
  const lesson = await prisma.lesson.create({ data: { courseId, title, position, videoUrl: videoUrl || null } });
  return NextResponse.json(lesson, { status: 201 });
}
