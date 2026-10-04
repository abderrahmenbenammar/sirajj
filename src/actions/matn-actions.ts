"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export type MatnActionResult = { ok: true; id: string } | { ok: false; error: string };

const matnSchema = z.object({
  title: z.string().trim().min(3, "عنوان المتن قصير جدًا").max(200, "عنوان المتن طويل جدًا"),
  description: z.string().trim().max(2000, "الوصف طويل جدًا").optional(),
});

const questionTypes = ["write", "reorder", "fill_blank", "mcq"] as const;
export type MatnQuizType = (typeof questionTypes)[number];

// Optional per-type payload: e.g. the 4 choices of an "mcq" question.
const matnQuizOptionsSchema = z
  .array(z.string().trim().min(1, "الخيار فارغ").max(1000, "الخيار طويل جدًا"))
  .min(2, "اختر خيارين على الأقل")
  .max(8, "لا يمكن تجاوز 8 خيارات")
  .optional();

const matnQuizSchema = z.object({
  matnId: z.string().min(1, "المتن مطلوب"),
  question: z.string().trim().min(3, "نص السؤال قصير جدًا").max(500, "نص السؤال طويل جدًا"),
  correctAnswer: z.string().trim().min(1, "النص الصحيح مطلوب").max(4000, "النص الصحيح طويل جدًا"),
  type: z.enum(questionTypes).default("write"),
  options: matnQuizOptionsSchema,
});

// Updates reuse the same field rules, minus the parent id (it comes as an argument).
const matnQuizUpdateSchema = matnQuizSchema.omit({ matnId: true });
const idSchema = z.string().trim().min(1, "المعرّف مطلوب");

/** Prisma P2025: update/delete targeted a record that no longer exists. */
function isPrismaNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}

/** Prisma P2003/P2014: a foreign key / required relation blocked the delete. */
function isForeignKeyBlocked(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "P2003" || code === "P2014";
}

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
  type?: MatnQuizType;
  options?: string[];
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
        type: parsed.data.type,
        options: parsed.data.options ?? Prisma.DbNull,
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

export async function updateMatn(
  id: string,
  data: { title: string; description?: string },
): Promise<MatnActionResult> {
  const forbidden = await adminOrError();
  if (forbidden) return { ok: false, error: forbidden };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: validationError(parsedId.error) };

  const parsed = matnSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };

  try {
    const existing = await prisma.matn.findUnique({
      where: { id: parsedId.data },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "المتن غير موجود" };

    await prisma.matn.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description?.length ? parsed.data.description : null,
      },
      select: { id: true },
    });
    revalidatePath("/admin/mutoon");
    revalidatePath("/dashboard/mutoon");
    revalidatePath(`/dashboard/mutoon/${existing.id}`);
    return { ok: true, id: existing.id };
  } catch (error) {
    if (isPrismaNotFound(error)) return { ok: false, error: "المتن غير موجود" };
    console.error("[matn-actions] updateMatn failed", error);
    return { ok: false, error: "تعذر تحديث المتن، حاول مجددًا" };
  }
}

export async function deleteMatn(id: string): Promise<MatnActionResult> {
  const forbidden = await adminOrError();
  if (forbidden) return { ok: false, error: forbidden };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: validationError(parsedId.error) };

  try {
    const existing = await prisma.matn.findUnique({
      where: { id: parsedId.data },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "المتن غير موجود" };

    // Atomic bulk delete: remove dependent quizzes explicitly first, then the
    // matn itself. This succeeds even in environments where the FK was created
    // WITHOUT ON DELETE CASCADE, and rolls everything back if anything fails
    // (e.g. an unexpected referencing table still blocks the delete).
    await prisma.$transaction([
      prisma.matnQuiz.deleteMany({ where: { matnId: existing.id } }),
      prisma.matn.delete({ where: { id: existing.id } }),
    ]);

    revalidatePath("/admin/mutoon");
    revalidatePath("/admin/matn");
    revalidatePath("/dashboard/mutoon");
    revalidatePath(`/dashboard/mutoon/${existing.id}`);
    return { ok: true, id: existing.id };
  } catch (error) {
    if (isPrismaNotFound(error)) return { ok: false, error: "المتن غير موجود" };
    if (isForeignKeyBlocked(error)) {
      console.error("[matn-actions] deleteMatn blocked by FK", error);
      return {
        ok: false,
        error: "عذراً، تعذر حذف المتن: هناك بيانات مرتبطة تمنع الحذف حاليًا",
      };
    }
    console.error("[matn-actions] deleteMatn failed", error);
    return { ok: false, error: "عذراً، تعذر حذف المتن" };
  }
}

export async function updateMatnQuiz(
  id: string,
  data: {
    question: string;
    correctAnswer: string;
    type?: MatnQuizType;
    options?: string[];
  },
): Promise<MatnActionResult> {
  const forbidden = await adminOrError();
  if (forbidden) return { ok: false, error: forbidden };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: validationError(parsedId.error) };

  const parsed = matnQuizUpdateSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };

  try {
    const existing = await prisma.matnQuiz.findUnique({
      where: { id: parsedId.data },
      select: { id: true, matnId: true },
    });
    if (!existing) return { ok: false, error: "السؤال غير موجود" };

    await prisma.matnQuiz.update({
      where: { id: existing.id },
      data: {
        question: parsed.data.question,
        correctAnswer: parsed.data.correctAnswer,
        type: parsed.data.type,
        options: parsed.data.options ?? Prisma.DbNull,
      },
      select: { id: true },
    });
    revalidatePath("/admin/mutoon");
    revalidatePath("/dashboard/mutoon");
    revalidatePath(`/dashboard/mutoon/${existing.matnId}`);
    return { ok: true, id: existing.id };
  } catch (error) {
    if (isPrismaNotFound(error)) return { ok: false, error: "السؤال غير موجود" };
    console.error("[matn-actions] updateMatnQuiz failed", error);
    return { ok: false, error: "تعذر تحديث السؤال، حاول مجددًا" };
  }
}

export async function deleteMatnQuiz(id: string): Promise<MatnActionResult> {
  const forbidden = await adminOrError();
  if (forbidden) return { ok: false, error: forbidden };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: validationError(parsedId.error) };

  try {
    const existing = await prisma.matnQuiz.findUnique({
      where: { id: parsedId.data },
      select: { id: true, matnId: true },
    });
    if (!existing) return { ok: false, error: "السؤال غير موجود" };

    await prisma.matnQuiz.delete({ where: { id: existing.id } });
    revalidatePath("/admin/mutoon");
    revalidatePath("/dashboard/mutoon");
    revalidatePath(`/dashboard/mutoon/${existing.matnId}`);
    return { ok: true, id: existing.id };
  } catch (error) {
    if (isPrismaNotFound(error)) return { ok: false, error: "السؤال غير موجود" };
    console.error("[matn-actions] deleteMatnQuiz failed", error);
    return { ok: false, error: "تعذر حذف السؤال، حاول مجددًا" };
  }
}

// ---- Bulk save of AI-generated quizzes (admin, idempotent) ----

const saveQuizItemSchema = matnQuizSchema.omit({ matnId: true });
const saveQuizzesSchema = z.object({
  matnId: z.string().trim().min(1, "المتن مطلوب"),
  questions: z
    .array(saveQuizItemSchema)
    .min(1, "لا توجد أسئلة للحفظ")
    .max(20, "لا يمكن حفظ أكثر من 20 سؤالًا في مرة واحدة"),
});

export type SaveMatnQuizzesResult =
  | { ok: true; id: string; created: number; skipped: number }
  | { ok: false; error: string };

/** Same whitespace-tolerant key as the generate route (idempotent re-save). */
function quizSaveKey(type: string, question: string, answer: string): string {
  const norm = (value: string) => value.replace(/\s+/g, " ").trim();
  return `${type}|${norm(question)}|${norm(answer)}`;
}

export async function saveMatnQuizzes(input: {
  matnId: string;
  questions: Array<{
    question: string;
    correctAnswer: string;
    type?: MatnQuizType;
    options?: string[];
  }>;
}): Promise<SaveMatnQuizzesResult> {
  const forbidden = await adminOrError();
  if (forbidden) return { ok: false, error: forbidden };

  const parsed = saveQuizzesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };

  try {
    const matn = await prisma.matn.findUnique({
      where: { id: parsed.data.matnId },
      select: { id: true },
    });
    if (!matn) return { ok: false, error: "المتن غير موجود" };

    // Idempotency: skip rows that already exist for this matn (same type +
    // whitespace-normalized question/answer), so re-saving is a no-op.
    const existing = await prisma.matnQuiz.findMany({
      where: { matnId: matn.id },
      select: { type: true, question: true, correctAnswer: true },
    });
    const keys = new Set(
      existing.map((row) => quizSaveKey(row.type, row.question, row.correctAnswer)),
    );
    const toCreate = parsed.data.questions.filter((item) => {
      const key = quizSaveKey(item.type, item.question, item.correctAnswer);
      if (keys.has(key)) return false;
      keys.add(key); // also dedupe within the payload itself
      return true;
    });

    if (toCreate.length > 0) {
      await prisma.matnQuiz.createMany({
        data: toCreate.map((item) => ({
          matnId: matn.id,
          question: item.question,
          correctAnswer: item.correctAnswer,
          type: item.type,
          // Options only make sense for mcq; other types always store NULL.
          options: item.type === "mcq" ? (item.options ?? Prisma.DbNull) : Prisma.DbNull,
        })),
      });
    }

    revalidatePath("/admin/mutoon");
    revalidatePath("/dashboard/mutoon");
    revalidatePath(`/dashboard/mutoon/${matn.id}`);
    return {
      ok: true,
      id: matn.id,
      created: toCreate.length,
      skipped: parsed.data.questions.length - toCreate.length,
    };
  } catch (error) {
    console.error("[matn-actions] saveMatnQuizzes failed", error);
    return { ok: false, error: "تعذر حفظ الأسئلة، حاول مجددًا" };
  }
}
