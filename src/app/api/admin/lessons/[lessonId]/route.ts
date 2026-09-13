import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ lessonId: string }> };

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { lessonId } = await params;
  const body = await request.json();
  const orderIndex = body.orderIndex ?? body.position;
  try {
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        titleAr: asText(body.titleAr) ?? asText(body.title) ?? undefined,
        titleEn: asText(body.titleEn) ?? undefined,
        orderIndex: Number.isInteger(orderIndex) && orderIndex >= 0 ? orderIndex : undefined,
        videoUrl: asText(body.videoUrl) ?? undefined,
        subtitleUrl: asText(body.subtitleUrl) ?? undefined,
      },
    });
    return NextResponse.json(lesson);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "يوجد درس بنفس الترتيب في هذه الدورة" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { lessonId } = await params;
  await prisma.lesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ success: true });
}
