import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ courseId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId } = await params;
  const body = await request.json();
  const course = await prisma.course.update({ where: { id: courseId }, data: { title: body.title, description: body.description, level: body.level, image: body.image } });
  return NextResponse.json(course);
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId } = await params;
  await prisma.course.delete({ where: { id: courseId } });
  return NextResponse.json({ success: true });
}
