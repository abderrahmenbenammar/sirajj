import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ questionId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { questionId } = await params;
  if (!UUID_RE.test(questionId)) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  const body = await request.json();
  const orderIndex = body.orderIndex;
  if (orderIndex !== undefined && (!Number.isInteger(orderIndex) || orderIndex < 0)) {
    return NextResponse.json({ error: "الترتيب غير صالح" }, { status: 400 });
  }
  try {
    const question = await prisma.examQuestion.update({
      where: { id: questionId },
      data: {
        questionTextAr: asText(body.questionTextAr) ?? asText(body.question) ?? undefined,
        questionTextEn: asText(body.questionTextEn) ?? undefined,
        orderIndex: orderIndex ?? undefined,
      },
      include: { options: true },
    });
    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "يوجد سؤال بنفس الترتيب في هذا الاختبار" }, { status: 409 });
    }
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { questionId } = await params;
  if (!UUID_RE.test(questionId)) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  try {
    // Options cascade. Attempt answers RESTRICT deletion while referenced.
    await prisma.examQuestion.delete({ where: { id: questionId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "تعذر حذف السؤال — توجد إجابات مسجلة مرتبطة به" },
      { status: 409 }
    );
  }
}
