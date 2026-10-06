import { NextResponse } from "next/server";
import { generateObject, zodSchema } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { normalizeArabicText } from "@/lib/text-normalization";

// Structured generation of a full question set can exceed the default budget.
export const maxDuration = 60;

const MAX_FULL_TEXT = 20_000;
const MATN_QUIZ_TYPE_VALUES = ["write", "reorder", "fill_blank", "mcq"] as const;
const matnQuizTypeSchema = z.enum(MATN_QUIZ_TYPE_VALUES);

const inputSchema = z.object({
  matnId: z.string().trim().min(1, "المتن مطلوب"),
  fullText: z
    .string()
    .trim()
    .min(50, "النص قصير جدًا (50 حرفًا على الأقل)")
    .max(MAX_FULL_TEXT, "النص طويل جدًا (الحد 20000 حرف)"),
  questionCount: z.number().int().min(3).max(16).optional().default(8),
  selectedTypes: z
    .array(matnQuizTypeSchema)
    .min(1, "اختر نوعًا واحدًا على الأقل")
    .max(MATN_QUIZ_TYPE_VALUES.length)
    .refine((types) => new Set(types).size === types.length, "لا تكرر أنواع الأسئلة")
    .optional()
    .default([...MATN_QUIZ_TYPE_VALUES]),
}).superRefine(({ questionCount, selectedTypes }, context) => {
  if (questionCount < selectedTypes.length) {
    context.addIssue({
      code: "custom",
      path: ["questionCount"],
      message: "عدد الأسئلة يجب ألا يقل عن عدد الأنواع المحددة",
    });
  }
});

const generatedQuestionSchema = z.object({
  question: z.string().min(3).max(500),
  type: matnQuizTypeSchema,
  answer: z.string().min(1).max(4000),
  options: z.array(z.string().min(1).max(1000)).max(8).optional(),
});
const generationSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1).max(20),
});

export type GeneratedMatnQuestion = z.infer<typeof generatedQuestionSchema>;

const SYSTEM_PROMPT = `أنت "مولّد أسئلة التسميع" — تُخرج أسئلة تفاعلية من متن شرعي واحد لاختبار حفظ الطالب.

تحليل النص:
- اقرأ المتن كاملًا واستخرج مقاطعه الأساسية ومفاهيمه وعباراته المفتاحية (شروط، أحكام، مصطلحات).
- وزّع الأسئلة بالتساوي على الأنواع التي يحددها المشرف في الطلب، ولا تستخدم أي نوع خارج القائمة المحددة.
- حقل question يظهر منفصلًا للطالب قبل الإجابة؛ يجب أن يختبر الحفظ أو الفهم ولا يحتوي الإجابة أو يقتبسها.

نوع السؤال ودوره:
1) reorder: التطبيق يبعثر كلمات answer تلقائيًا؛ اجعل question توجيهًا أو تلميحًا موضوعيًا قصيرًا فقط، ولا تنقل فيه كلمات المقطع.
2) fill_blank: التطبيق يحذف كلمات من answer تلقائيًا؛ اجعل question تلميحًا قصيرًا عن الموضوع فقط، ولا تكتب الجملة كاملة أو نسخةً فيها فراغات.
3) mcq: اطرح سؤالًا محايدًا عن المعنى أو الحكم. أضف 4 خيارات: الإجابة الصحيحة هي answer حرفيًا + 3 مشتتات معقولة، وضع الإجابة الصحيحة في الخيارات فقط، لا في question.
4) write: اطلب كتابة المقطع عبر وصف معناه أو موضوعه، من دون اقتباس بدايته أو ذكر كلماته المفتاحية التي تكشفه.

قواعد صارمة:
- كل إجابة (answer) مأخوذة من النص المُعطى نفسه — لا تخترع ولا تلخّص ولا تغيّر صياغة المتن في الإجابة.
- answer هو النص المرجعي الكامل. لا تكرر answer في question، ولا تضع فيه بدايته أو جملةً مرادفةً تكشف النص المطلوب.
- في أسئلة reorder و fill_blank، واجهة الطالب تعرض الكلمات المبعثرة أو الفراغات من answer تلقائيًا؛ لا تضع نص answer أو الكلمات المحذوفة في question.
- قبل إخراج كل سؤال، قارن question مع answer. إذا احتوى question على answer كاملًا أو اقتبس أربع كلمات متتابعة أو أكثر منه، فأعد صياغة question كتلميح دلالي لا يكشف النص.
- مثال: إذا كانت الإجابة «من حسن إسلام المرء تركه ما لا يعنيه»، فالسؤال «أكمل: من حسن إسلام المرء تركه...» مرفوض. لسؤال الكتابة استخدم تلميحًا مثل «اكتب الحديث الذي يوجّه المسلم إلى حسن اختيار ما يشغله».
- اكتب نصوص الأسئلة بالعربية الفصحى البسيطة، وأعد العدد المطلوب من الأسئلة بالضبط (لا أكثر ولا أقل).
- لا تتجاوز حدود النص المُعطى بأي سؤال.`;

/** Cheap idempotency key shared with the saveMatnQuizzes action. */
function questionKey(type: string, question: string, answer: string): string {
  // Light normalization so whitespace/hamza variants don't duplicate rows.
  const norm = (value: string) => value.replace(/\s+/g, " ").trim();
  return `${type}|${norm(question)}|${norm(answer)}`;
}

/** Reject question wording that copies the answer or a revealing phrase from it. */
function revealsAnswer(question: string, answer: string): boolean {
  const normalizedQuestion = normalizeArabicText(question);
  const normalizedAnswer = normalizeArabicText(answer);
  if (!normalizedQuestion || !normalizedAnswer) return false;

  if (normalizedAnswer.length >= 8 && normalizedQuestion.includes(normalizedAnswer)) return true;

  const questionWords = normalizedQuestion.split(" ");
  const answerWords = normalizedAnswer.split(" ");
  if (answerWords.length < 4) return false;

  for (let answerIndex = 0; answerIndex <= answerWords.length - 4; answerIndex += 1) {
    for (let questionIndex = 0; questionIndex <= questionWords.length - 4; questionIndex += 1) {
      let matchingWords = 0;
      while (
        answerWords[answerIndex + matchingWords] === questionWords[questionIndex + matchingWords]
      ) {
        matchingWords += 1;
        if (matchingWords >= 4) return true;
        if (
          answerIndex + matchingWords >= answerWords.length ||
          questionIndex + matchingWords >= questionWords.length
        ) {
          break;
        }
      }
    }
  }

  return false;
}

/**
 * Post-process model output into the exact shape the student UI consumes:
 * - trim everything, drop empty items
 * - mcq: dedupe options, guarantee the correct answer is among them,
 *   degrade to write when there are too few usable distractors
 * - strip options for non-mcq types
 */
function normalizeQuestions(
  items: z.infer<typeof generatedQuestionSchema>[],
  count: number,
  selectedTypes: readonly z.infer<typeof matnQuizTypeSchema>[],
): { questions: GeneratedMatnQuestion[]; rejectedAnswerLeaks: number } {
  const out: GeneratedMatnQuestion[] = [];
  const seen = new Set<string>();
  let rejectedAnswerLeaks = 0;
  for (const item of items) {
    if (!selectedTypes.includes(item.type)) continue;

    const question = item.question.trim();
    const answer = item.answer.trim();
    if (question.length < 3 || answer.length === 0) continue;
    if (revealsAnswer(question, answer)) {
      rejectedAnswerLeaks += 1;
      continue;
    }

    let type = item.type;
    let options: string[] | undefined;

    if (type === "mcq") {
      const opts: string[] = [];
      for (const raw of item.options ?? []) {
        const value = raw.trim();
        if (value.length > 0 && !opts.includes(value)) opts.push(value);
        if (opts.length >= 8) break;
      }
      if (!opts.includes(answer)) opts.unshift(answer);
      if (opts.length < 3) {
        if (!selectedTypes.includes("write")) continue;
        type = "write"; // not enough distractors -> free writing is honest
        options = undefined;
      } else {
        options = opts;
      }
    }

    const key = questionKey(type, question, answer);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ question, type, answer, options });
    if (out.length >= count) break;
  }
  return { questions: out, rejectedAnswerLeaks };
}

export async function POST(request: Request) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await request.json().catch(() => null);
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 },
      );
    }
    const { matnId, fullText, questionCount, selectedTypes } = parsed.data;

    const matn = await prisma.matn.findUnique({
      where: { id: matnId },
      select: { id: true, title: true },
    });
    if (!matn) return NextResponse.json({ error: "المتن غير موجود" }, { status: 404 });

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "خدمة التوليد الذكي غير مهيأة حاليًا" },
        { status: 503 },
      );
    }

    // Same failover strategy as grade-matn/transcribe.
    const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    const override = (process.env.GENERATE_MATN_QUIZZES_MODEL_CHAIN ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const modelChain = override.length > 0 ? override : DEFAULT_MODELS;

    // Hard budget under maxDuration=60 so exhausted attempts still return JSON.
    const deadline = Date.now() + 50_000;
    let generated: z.infer<typeof generationSchema> | null = null;

    for (const modelName of modelChain) {
      const remaining = deadline - Date.now();
      if (remaining <= 500) break;
      try {
        const result = await generateObject({
          model: google(modelName),
          schema: zodSchema(generationSchema),
          system: SYSTEM_PROMPT,
          prompt: `عنوان المتن: ${matn.title}\nعدد الأسئلة المطلوب: ${questionCount}\nالأنواع المحددة فقط: ${selectedTypes.join(" / ")}\n\nنص المتن:\n${fullText}\n\nولّد ${questionCount} سؤالًا من هذا المتن باستخدام الأنواع المحددة فقط، ووزّعها بينها بالتساوي. يجب أن يظهر كل نوع محدد مرة واحدة على الأقل.`,
          maxRetries: modelName === modelChain[0] ? 3 : 1,
          abortSignal: AbortSignal.timeout(remaining),
        });
        generated = result.object;
        break;
      } catch (error) {
        console.error("Generate Matn Quizzes Error:", modelName, error);
      }
    }

    if (!generated) {
      return NextResponse.json(
        { error: "تعذر الاتصال بخدمة التوليد الذكي، حاول مجددًا" },
        { status: 502 },
      );
    }

    const normalized = normalizeQuestions(generated.questions, questionCount, selectedTypes);
    const questions = normalized.questions;
    if (questions.length < questionCount) {
      return NextResponse.json(
        {
          error:
            normalized.rejectedAnswerLeaks > 0
              ? "استُبعدت أسئلة لأن صياغتها كشفت الإجابة ولم يكتمل العدد المطلوب. أعد التوليد أو قلل عدد الأسئلة"
              : "لم يتمكن النموذج من استخراج العدد المطلوب من الأسئلة الصالحة. حاول بنص مختلف",
        },
        { status: 502 },
      );
    }

    const missingTypes = selectedTypes.filter(
      (type) => !questions.some((question) => question.type === type),
    );
    if (missingTypes.length > 0) {
      return NextResponse.json(
        { error: "لم ينشئ النموذج سؤالًا لكل الأنواع المحددة. قلّل الأنواع أو حاول مجددًا" },
        { status: 502 },
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Generate Matn Quizzes Error:", error);
    return NextResponse.json(
      { error: "تعذر توليد الأسئلة حاليًا، حاول مجددًا" },
      { status: 500 },
    );
  }
}
