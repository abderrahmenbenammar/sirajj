import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { lessonId, question, options, correctIndex } = await request.json();
  if (!lessonId || !question || !Array.isArray(options) || options.length < 2 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return NextResponse.json({ error: "بيانات الاختبار غير صحيحة" }, { status: 400 });
  }
  const quiz = await prisma.quizQuestion.create({ data: { lessonId, question, options: JSON.stringify(options), correctIndex } });
  return NextResponse.json(quiz, { status: 201 });
}
