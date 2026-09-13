import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  // Canonical v2: titleAr/titleEn/orderIndex; legacy `title`/`position` accepted as aliases.
  const courseId = asText(body.courseId);
  const titleAr = asText(body.titleAr) ?? asText(body.title);
  const orderIndex = body.orderIndex ?? body.position;
  const videoUrl = asText(body.videoUrl);
  if (!courseId || !titleAr || !Number.isInteger(orderIndex) || orderIndex < 0 || !videoUrl) {
    return NextResponse.json({ error: "بيانات الدرس غير صحيحة" }, { status: 400 });
  }
  try {
    const lesson = await prisma.lesson.create({
      data: { courseId, titleAr, titleEn: asText(body.titleEn) ?? titleAr, orderIndex, videoUrl, subtitleUrl: asText(body.subtitleUrl) },
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "يوجد درس بنفس الترتيب في هذه الدورة" }, { status: 409 });
    }
    throw error;
  }
}
