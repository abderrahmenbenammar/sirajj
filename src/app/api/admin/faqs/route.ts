import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asInt(value: unknown, fallback: number): number | null {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  const questionAr = asText(body.questionAr) ?? asText(body.question);
  const questionEn = asText(body.questionEn) ?? questionAr;
  const answerAr = asText(body.answerAr) ?? asText(body.answer);
  const answerEn = asText(body.answerEn) ?? answerAr;
  if (!questionAr || !questionEn || !answerAr || !answerEn) {
    return NextResponse.json({ error: "السؤال والإجابة باللغتين حقول مطلوبة" }, { status: 400 });
  }
  const orderIndex = asInt(body.orderIndex, 0);
  if (orderIndex === null || orderIndex < 0) {
    return NextResponse.json({ error: "الترتيب غير صالح" }, { status: 400 });
  }
  const faq = await prisma.faq.create({
    data: {
      questionAr,
      questionEn,
      answerAr,
      answerEn,
      category: asText(body.category) ?? "general",
      orderIndex,
    },
  });
  return NextResponse.json(faq, { status: 201 });
}
