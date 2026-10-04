import { NextResponse } from "next/server";
import { generateObject, zodSchema } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// Structured generation of a full question set can exceed the default budget.
export const maxDuration = 60;

const MAX_FULL_TEXT = 20_000;

const inputSchema = z.object({
  matnId: z.string().trim().min(1, "المتن مطلوب"),
  fullText: z
    .string()
    .trim()
    .min(50, "النص قصير جدًا (50 حرفًا على الأقل)")
    .max(MAX_FULL_TEXT, "النص طويل جدًا (الحد 20000 حرف)"),
  questionCount: z.number().int().min(3).max(16).optional().default(8),
});

const generatedQuestionSchema = z.object({
  question: z.string().min(3).max(500),
  type: z.enum(["write", "reorder", "fill_blank", "mcq"]),
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
- وزّن الأسئلة بالتساوي بين الأنواع الأربعة قدر الإمكان:

نوع السؤال ودوره:
1) reorder: عبارة قصيرة أو مقطع قصير من المتن يُبعثر كلماته ويُعاد ترتيبه. الإجابة = العبارة كاملة بترتيبها الصحيح.
2) fill_blank: جملة من المتن تُحذف منها كلمات مفتاحية (مصطلح/شرط/حكم) ليكملها الطالب. الإجابة = الجملة كاملة بكل كلماتها الأصلية (لا تحذف منها شيئًا).
3) mcq: سؤال اختيار من متعدد يختبر مفهومًا أو عبارة محددة من المتن. أضف 4 خيارات: خيار واحد صحيح هو نص الإجابة حرفيًا من المتن + 3 مشتتات دقيقة ومحكمة وفق مصطلحات الدراسات الإسلامية واللغة العربية، متقاربة في الطول والأسلوب ومختلفة في المعنى، لا تكرر نوع الخطأ نفسه في المشتتات، ولا تجعل أي مشتت صحيحًا أيضًا.
4) write: سؤال إجابة قصيرة مباشر يطلب حفظ مقطع أساسي من المتن.

قواعد صارمة:
- كل إجابة (answer) مأخوذة من النص المُعطى نفسه — لا تخترع ولا تلخّص ولا تغيّر صياغة المتن في الإجابة.
- أسئلة fill_blank و reorder: الإجابة نص المتن حرفيًا (مع علامات ترقيم خفيفة فقط إن لزم).
- اكتب نصوص الأسئلة بالعربية الفصحى البسيطة، وأعد العدد المطلوب من الأسئلة بالضبط (لا أكثر ولا أقل).
- لا تتجاوز حدود النص المُعطى بأي سؤال.`;

/** Cheap idempotency key shared with the saveMatnQuizzes action. */
function questionKey(type: string, question: string, answer: string): string {
  // Light normalization so whitespace/hamza variants don't duplicate rows.
  const norm = (value: string) => value.replace(/\s+/g, " ").trim();
  return `${type}|${norm(question)}|${norm(answer)}`;
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
): GeneratedMatnQuestion[] {
  const out: GeneratedMatnQuestion[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const question = item.question.trim();
    const answer = item.answer.trim();
    if (question.length < 3 || answer.length === 0) continue;

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
  return out;
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
    const { matnId, fullText, questionCount } = parsed.data;

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
          prompt: `عنوان المتن: ${matn.title}\nعدد الأسئلة المطلوب: ${questionCount}\n\nنص المتن:\n${fullText}\n\nولّد ${questionCount} أسئلة متنوعة (write / reorder / fill_blank / mcq) متوازنة من هذا المتن.`,
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

    const questions = normalizeQuestions(generated.questions, questionCount);
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "لم يتمكن النموذج من استخراج أسئلة صالحة من هذا النص، حاول بنص مختلف" },
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
