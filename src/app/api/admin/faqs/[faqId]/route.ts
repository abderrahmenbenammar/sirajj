import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ faqId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { faqId } = await params;
  if (!UUID_RE.test(faqId)) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  const body = await request.json();
  const orderIndex = body.orderIndex;
  if (orderIndex !== undefined && (!Number.isInteger(orderIndex) || orderIndex < 0)) {
    return NextResponse.json({ error: "الترتيب غير صالح" }, { status: 400 });
  }
  try {
    const faq = await prisma.faq.update({
      where: { id: faqId },
      data: {
        questionAr: asText(body.questionAr) ?? undefined,
        questionEn: asText(body.questionEn) ?? undefined,
        answerAr: asText(body.answerAr) ?? undefined,
        answerEn: asText(body.answerEn) ?? undefined,
        category: asText(body.category) ?? undefined,
        orderIndex: orderIndex ?? undefined,
      },
    });
    return NextResponse.json(faq);
  } catch {
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { faqId } = await params;
  if (!UUID_RE.test(faqId)) return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  try {
    // FAQs are never referenced elsewhere: deletion is always clean.
    await prisma.faq.delete({ where: { id: faqId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }
}
