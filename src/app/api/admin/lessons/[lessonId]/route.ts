import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ lessonId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { lessonId } = await params;
  const body = await request.json();
  const lesson = await prisma.lesson.update({ where: { id: lessonId }, data: { title: body.title, position: body.position, videoUrl: body.videoUrl || null } });
  return NextResponse.json(lesson);
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { lessonId } = await params;
  await prisma.lesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ success: true });
}
