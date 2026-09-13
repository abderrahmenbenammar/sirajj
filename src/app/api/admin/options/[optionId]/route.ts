import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ optionId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { optionId } = await params;
  if (!UUID_RE.test(optionId)) return NextResponse.json({ error: "الخيار غير موجود" }, { status: 404 });
  const body = await request.json();
  // Text-only edits: correctness is fixed at creation (single-correct rule).
  const textAr = asText(body.optionTextAr) ?? asText(body.optionText);
  if (!textAr && !asText(body.optionTextEn)) {
    return NextResponse.json({ error: "بيانات الخيار غير صحيحة" }, { status: 400 });
  }
  try {
    const option = await prisma.examQuestionOption.update({
      where: { id: optionId },
      data: { optionTextAr: textAr ?? undefined, optionTextEn: asText(body.optionTextEn) ?? undefined },
    });
    return NextResponse.json(option);
  } catch {
    return NextResponse.json({ error: "الخيار غير موجود" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { optionId } = await params;
  if (!UUID_RE.test(optionId)) return NextResponse.json({ error: "الخيار غير موجود" }, { status: 404 });
  const option = await prisma.examQuestionOption.findUnique({
    where: { id: optionId },
    select: { id: true, questionId: true, isCorrect: true },
  });
  if (!option) return NextResponse.json({ error: "الخيار غير موجود" }, { status: 404 });
  if (option.isCorrect) {
    const correctCount = await prisma.examQuestionOption.count({
      where: { questionId: option.questionId, isCorrect: true },
    });
    if (correctCount <= 1) {
      return NextResponse.json({ error: "لا يمكن حذف الإجابة الصحيحة الوحيدة للسؤال" }, { status: 409 });
    }
  }
  try {
    // Referenced answers RESTRICT deletion while they exist.
    await prisma.examQuestionOption.delete({ where: { id: optionId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "تعذر حذف الخيار — توجد إجابات مسجلة مرتبطة به" },
      { status: 409 }
    );
  }
}
