"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export type MatnActionResult = { ok: true; id: string } | { ok: false; error: string };

const matnSchema = z.object({
  title: z.string().trim().min(3, "عنوان المتن قصير جدًا").max(200, "عنوان المتن طويل جدًا"),
  description: z.string().trim().max(2000, "الوصف طويل جدًا").optional(),
});

const matnQuizSchema = z.object({
  matnId: z.string().min(1, "المتن مطلوب"),
  question: z.string().trim().min(3, "نص السؤال قصير جدًا").max(500, "نص السؤال طويل جدًا"),
  correctAnswer: z.string().trim().min(1, "النص الصحيح مطلوب").max(4000, "النص الصحيح طويل جدًا"),
});

async function adminOrError(): Promise<string | null> {
  // Fresh DB role check on every mutation (same rule as the admin API routes).
  const { response } = await requireAdmin();
  return response ? "غير مصرح" : null;
}

function validationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "بيانات غير صالحة";
}

export async function createMatn(input: {
  title: string;
  description?: string;
}): Promise<MatnActionResult> {
  const forbidden = await adminOrError();
  if (forbidden) return { ok: false, error: forbidden };

  const parsed = matnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };

  try {
    const matn = await prisma.matn.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description?.length ? parsed.data.description : null,
      },
      select: { id: true },
    });
    revalidatePath("/admin/mutoon");
    revalidatePath("/dashboard/mutoon");
    return { ok: true, id: matn.id };
  } catch (error) {
    console.error("[matn-actions] createMatn failed", error);
    return { ok: false, error: "تعذر إنشاء المتن، حاول مجددًا" };
  }
}

export async function createMatnQuiz(input: {
  matnId: string;
  question: string;
  correctAnswer: string;
}): Promise<MatnActionResult> {
  const forbidden = await adminOrError();
  if (forbidden) return { ok: false, error: forbidden };

  const parsed = matnQuizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };

  try {
    const matn = await prisma.matn.findUnique({
      where: { id: parsed.data.matnId },
      select: { id: true },
    });
    if (!matn) return { ok: false, error: "المتن غير موجود" };

    const quiz = await prisma.matnQuiz.create({
      data: {
        matnId: matn.id,
        question: parsed.data.question,
        correctAnswer: parsed.data.correctAnswer,
      },
      select: { id: true },
    });
    revalidatePath("/admin/mutoon");
    revalidatePath("/dashboard/mutoon");
    revalidatePath(`/dashboard/mutoon/${matn.id}`);
    return { ok: true, id: quiz.id };
  } catch (error) {
    console.error("[matn-actions] createMatnQuiz failed", error);
    return { ok: false, error: "تعذر إنشاء السؤال، حاول مجددًا" };
  }
}
