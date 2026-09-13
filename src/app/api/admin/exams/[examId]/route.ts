import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ examId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { examId } = await params;
  if (!UUID_RE.test(examId)) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: { select: { id: true, titleAr: true } },
      questions: { include: { options: { orderBy: { createdAt: "asc" } } }, orderBy: { orderIndex: "asc" } },
    },
  });
  if (!exam) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  return NextResponse.json(exam);
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { examId } = await params;
  if (!UUID_RE.test(examId)) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  const body = await request.json();
  const passing = body.passingScorePercentage;
  const max = body.maxAttempts;
  if (passing !== undefined && (!Number.isInteger(passing) || passing < 0 || passing > 100)) {
    return NextResponse.json({ error: "درجة النجاح يجب أن تكون بين 0 و 100" }, { status: 400 });
  }
  if (max !== undefined && (!Number.isInteger(max) || max < 1)) {
    return NextResponse.json({ error: "عدد المحاولات يجب أن يكون 1 على الأقل" }, { status: 400 });
  }
  try {
    const exam = await prisma.exam.update({
      where: { id: examId },
      data: {
        titleAr: asText(body.titleAr) ?? undefined,
        titleEn: asText(body.titleEn) ?? undefined,
        passingScorePercentage: passing ?? undefined,
        maxAttempts: max ?? undefined,
      },
    });
    return NextResponse.json(exam);
  } catch {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { examId } = await params;
  if (!UUID_RE.test(examId)) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  try {
    // Cascades to questions/options/attempts/answers. If submitted answers
    // reference this exam, the database RESTRICT guards refuse the delete.
    await prisma.exam.delete({ where: { id: examId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "تعذر حذف الاختبار — قد تكون هناك محاولات مسجلة مرتبطة به" },
      { status: 409 }
    );
  }
}
