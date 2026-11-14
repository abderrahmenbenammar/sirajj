import { NextResponse } from "next/server";
import { generateObject, zodSchema, NoObjectGeneratedError } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasQuestionQualityIssue } from "@/lib/question-quality";

// Prisma + Auth.js run here, so the Node.js runtime is required (same as the
// working /api/grade-matn route).
export const runtime = "nodejs";
// Budget must stay under maxDuration so the handler ALWAYS returns its own
// JSON: two generation attempts (18s + 8s) + review (8s) + auth/DB overhead
// fit inside 26s of work, leaving margin below the 30s platform cap. Above
// the cap Vercel kills the invocation with a non-JSON 504 that the frontend
// can only show as the generic "تعذر الاتصال بخدمة التوليد الذكي".
export const maxDuration = 30;

// Overall work budget inside maxDuration (auth/DB/response margin: 4s).
const DEADLINE_BUDGET_MS = 26_000;
// Per-attempt safety windows. A model that stalls on Google's side (measured
// 2026-11-14: gemini-3.8-flash hung 50s for THIS exact generation call) must
// be cut off so the healthy model still gets its turn before the platform cap.
// These cancel only a stalled connection — never an SDK retry delay, because
// maxRetries is 0 (that combination is what caused the old "Delay was
// aborted" bug: retry delays aborted by a route-level timeout).
const GEN_ATTEMPT_TIMEOUT_MS = 18_000;
const FALLBACK_ATTEMPT_TIMEOUT_MS = 8_000;
const REVIEW_TIMEOUT_MS = 8_000;

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
const questionRevisionSchema = z.object({
  revisions: z.array(
    z.object({
      index: z.number().int().min(0).max(19),
      question: z.string().min(3).max(500),
    }),
  ).max(20),
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

معايير تصميم السؤال (صفر تسريب — ألزامية لكل سؤال):
1) منع التسريب اللفظي: لا تضع في question المفردات المميزة للإجابة، ولا حكمها، ولا صياغتها الحرفيّة أو ما يعادلها لفظًا. إذا ظهرت الكلمة المفتاحية في السؤال، فالمستمع يخمّن ولا يتذكّر.
2) منع الأسئلة الإيحائية: لا تبدأ أي سؤال بـ«هل ...؟» متى كانت صياغته تلمّح إلى الجواب (مثل «هل يُعدّ كذا من نواقض كذا؟»)، ولا تستعمل صياغةً تُلمّح لـ«نعم/لا» أو تفترض الحكم. حوّل كل مثلها إلى سؤال تحليلي أو استذكاري مباشر يلزم التعلّم بالمعرفة لا بالتخمين.
3) الأنماط الذكية للمتون الشرعية — اختر الأنسب لكل سؤال، من هذه الأربعة حصريًا:
   - استنباط الحكم أو الشرط أو الركن: اسأل عن الحكم أو الشرط أو الركن أو الناقض الخاص بحالة معيّنة دون تسميتها في السؤال (مثل: «ما الحكم المترتب على تعمّد ترك ركنٍ من أركان الصلاة كما قرّره المصنّف؟»).
   - التمييز بين المتشابهات: اطلب التمييز بين مفاهيم متقاربة أو بيان الضابط الفارق الذي ذكره المصنّف.
   - التطبيق على مسألة مختصرة: قدّم تعريفًا أو واقعة موجزة بصياغتك، واطلب اسم المفهوم أو حكمه كما في المتن.
   - الاستحضار الموجّه: عند اختبار الحفظ، اطلب العدّة أو التفصيل كاملاً («اذكر الشروط الثلاثة التي اشترطها المصنّف لـ...») دون إطعام نصف كل فقرة في السؤال.
   - تنويع إلزامي: وزّع الأسئلة على ثلاثة أنماط مختلفة على الأقل داخل المجموعة الواحدة، ولا تكرر النمط نفسه في كل الأسئلة.
4) اقتران الإجابة: يبقى كل سؤال مقترنًا بـ answer النصي المرجعي حتى يُصحَّح دلاليًا؛ لا تغيّر الإجابة، ولا تجعل السؤال يتخطّى ما ورد في النص.

قواعد صارمة:
- كل إجابة (answer) مأخوذة من النص المُعطى نفسه — لا تخترع ولا تلخّص ولا تغيّر صياغة المتن في الإجابة.
- answer هو النص المرجعي الكامل. لا تكرر answer في question، ولا تضع فيه بدايته أو جملةً مرادفةً تكشف النص المطلوب.
- في أسئلة reorder و fill_blank، واجهة الطالب تعرض الكلمات المبعثرة أو الفراغات من answer تلقائيًا؛ لا تضع نص answer أو الكلمات المحذوفة في question.
- قبل إخراج كل سؤال، قارن question مع answer. إذا احتوى question على answer كاملًا أو اقتبس أربع كلمات متتابعة أو أكثر منه، فأعد صياغة question كتلميح دلالي لا يكشف النص.
- مثال: إذا كانت الإجابة «من حسن إسلام المرء تركه ما لا يعنيه»، فالسؤال «أكمل: من حسن إسلام المرء تركه...» مرفوض. لسؤال الكتابة استخدم تلميحًا مثل «اكتب الحديث الذي يوجّه المسلم إلى حسن اختيار ما يشغله».
- اكتب نصوص الأسئلة بالعربية الفصحى البسيطة، وأعد العدد المطلوب من الأسئلة بالضبط (لا أكثر ولا أقل).
- لا تتجاوز حدود النص المُعطى بأي سؤال.`;

const QUESTION_REVIEW_PROMPT = `أنت مراجع تربوي دقيق لأسئلة حفظ المتون. أعد كتابة نصوص الأسئلة التي تحتوي مشكلة فقط، واترك الإجابات والأنواع والخيارات كما هي. لا تُخرج revision لسؤال سليم.

قواعد المراجعة (لا يُقبل سؤال إلا بعد تحقّقها كلها):
- لا تكشف answer داخل question، ولا تكرر مفرداته المميزة أو حكمه، ولا تقتبس منه أربع كلمات متتابعة أو أكثر، ولا تضع تلميحًا يجعل الإجابة منسوخة أو ظاهرة.
- لا تبدأ السؤال بـ«هل» إذا كانت الصياغة تلمّح إلى الجواب؛ حوّله إلى سؤال تحليلي مباشر (استنباط الحكم أو الركن، أو التمييز والفروق، أو التطبيق والتمثيل، أو الاستحضار الموجّه).
- استخدم أنماطًا ذكية مناسبة للمتون: استنباط الحكم أو الركن، التمييز والفروق بين مفاهيم متقاربة، التطبيق والتمثيل بواقعة موجزة، الاستحضار الموجّه لطلب العدّة أو التفصيل دون إطعام بدايته.
- write: اسأل عن المقطع من خلال موضوعه أو معناه دون اقتباس ألفاظه أو بدايته.
- mcq: اسأل عن المعنى أو الحكم، واترك الإجابة الصحيحة ضمن الخيارات فقط.
- reorder: واجهة الطالب تعرض الكلمات مبعثرة من answer؛ اجعل السؤال توجيهًا قصيرًا فقط.
- fill_blank: واجهة الطالب تنشئ الفراغات من answer؛ اجعل السؤال توجيهًا أو سياقًا قصيرًا لا يعيد كلمات النص.
- حافظ على صلة السؤال بالمتن، واجعله عربيًا فصيحًا واضحًا ومتنوّعًا لا آليًا أو عامًا ما أمكن.
- أعد مراجعة كل صياغة قبل إخراجها. إذا لم تستطع كتابة سؤال آمن، حوّله إلى سؤال توجيهي عام مناسب للنوع بدل نقل الإجابة.
- أخرج revision لكل index مشكل فقط، ولا تُعد الإجابة أو أي حقل آخر.`;

/** Cheap idempotency key shared with the saveMatnQuizzes action. */
function questionKey(type: string, question: string, answer: string): string {
  // Light normalization so whitespace/hamza variants don't duplicate rows.
  const norm = (value: string) => value.replace(/\s+/g, " ").trim();
  return `${type}|${norm(question)}|${norm(answer)}`;
}

/** Human-readable message from any thrown value (shared shape with grade-matn). */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Salvage structured output when the model wrapped its JSON in markdown
 * fences (```json ... ```), which is the one parse failure generateObject
 * cannot retry away. Strips the fences, parses, and validates against the
 * same schema before anything is trusted.
 */
function salvageGeneratedQuestions(error: unknown): z.infer<typeof generationSchema> | null {
  if (!NoObjectGeneratedError.isInstance(error) || !error.text) return null;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(error.text);
  const raw = (fenced ? fenced[1] : error.text).trim();
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const validated = generationSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

/** Reject question wording that copies the answer or a revealing phrase from it. */
// The lexical gate now lives in @/lib/question-quality (shared with the
// manual admin actions) and is consumed as hasQuestionQualityIssue below.

function fallbackQuestion(type: z.infer<typeof matnQuizTypeSchema>): string {
  switch (type) {
    case "write":
      return "اكتب المقطع الذي يقرر المعنى المقصود في هذا الباب كما ورد في المتن.";
    case "mcq":
      return "أي الخيارات يوافق ما قرره المتن في هذا الموضوع؟";
    case "reorder":
      return "رتّب الكلمات المعروضة لتكوين المقطع كما ورد في المتن.";
    case "fill_blank":
      return "أكمل الكلمات الناقصة من المقطع كما ورد في المتن.";
  }
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
): GeneratedMatnQuestion[] {
  const out: GeneratedMatnQuestion[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!selectedTypes.includes(item.type)) continue;

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
  return out;
}

/**
 * Semantic review pass over EVERY generated question (not only machine-flagged
 * ones): the lexical gate can miss semantic leakage ("هل يُعدّ ... من ...؟" or
 * a hint that paraphrases the ruling), so the model reads all stems and only
 * returns revisions for the ones it judges revealing. Machine flags remain the
 * safety net — any question still failing the gate after revision falls back
 * to a neutral stem.
 */
async function reviewQuestions(
  questions: GeneratedMatnQuestion[],
  modelName: string,
  googleProvider: ReturnType<typeof createGoogle>,
  deadline: number,
): Promise<GeneratedMatnQuestion[]> {
  if (questions.length === 0) return questions;

  const reviewPayload = questions.map((question, index) => ({
    index,
    type: question.type,
    question: question.question,
    answer: question.answer,
    // Machine flag: the lexical gate already proved this stem copies its
    // answer. Handed to the reviewer so flagged stems get rewritten for sure.
    machineFlagged: hasQuestionQualityIssue(question.question, question.answer),
  }));

  const revisedQuestions = new Map<number, string>();
  const remaining = Math.min(deadline - Date.now(), REVIEW_TIMEOUT_MS);
  if (remaining > 1_000) {
    try {
      const result = await generateObject({
        model: googleProvider(modelName),
        schema: zodSchema(questionRevisionSchema),
        system: QUESTION_REVIEW_PROMPT,
        prompt: `راجع كل الأسئلة التالية من متن واحد. الأسئلة المعلّمة machineFlagged=true كشفتها بوابة آلية بأنها تنقل مفردات إجابتها أو اقتبسها؛ أعد صياغتها إجباريًا بلغة تلميحية لا تنقل أي مفردة من الإجابة. أما الأسئلة machineFlagged=false فلا تُخرج لها revision إلا إذا رأيت فيها تسريبًا أو سؤال «هل» إيحائيًا. أعِد كتابة السؤال فقط، مع الحفظ على نوعه وصلته بالمتن.\n\nالأسئلة:\n${JSON.stringify(reviewPayload)}`,
        // Never retry, and never let the abort signal touch a retry delay
        // (maxRetries 0 above) — this window only cuts a stalled review call.
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(remaining),
      });
      for (const revision of result.object.revisions) {
        const question = questions[revision.index];
        const text = revision.question.trim();
        // Accept only a real, safe rewrite: never let a bad revision replace
        // a good stem (or reintroduce leakage the gate can detect).
        if (question && text.length >= 3 && !hasQuestionQualityIssue(text, question.answer)) {
          revisedQuestions.set(revision.index, text);
        }
      }
    } catch (error) {
      // Review is best-effort: the lexical gate below still repairs stems.
      console.error("GEMINI_GENERATION_ERROR: question review failed", { modelName, error });
    }
  }

  return questions.map((question, index) => {
    const revision = revisedQuestions.get(index);
    if (revision && revision !== question.question) {
      return { ...question, question: revision };
    }
    if (hasQuestionQualityIssue(question.question, question.answer)) {
      return { ...question, question: fallbackQuestion(question.type) };
    }
    return question;
  });
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

    // Same trimmed key resolution as /api/grade-matn (both env names).
    const apiKey = (
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
    ).trim();
    if (!apiKey) {
      console.warn(
        "GEMINI_GENERATION_CONFIG_ERROR: GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is missing",
      );
      return NextResponse.json(
        { error: "خدمة التوليد الذكي غير مهيأة حاليًا" },
        { status: 503 },
      );
    }
    const googleProvider = createGoogle({ apiKey });

    // Same failover strategy as grade-matn: the model that reliably answers
    // goes FIRST. gemini-3.8-flash currently stalls on Google's side (repro
    // 2026-11-14: it hung this very generation call for the full 50s budget,
    // so the old config never reached the healthy model and always returned
    // the 502 below). Restore 3.8 first without a redeploy via
    // GENERATE_MATN_QUIZZES_MODEL_CHAIN=gemini-3.8-flash,gemini-3.5-flash-lite.
    const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
    const override = (process.env.GENERATE_MATN_QUIZZES_MODEL_CHAIN ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const modelChain = override.length > 0 ? override : DEFAULT_MODELS;

    // Hard budget under maxDuration=30 so exhausted attempts still return JSON.
    const deadline = Date.now() + DEADLINE_BUDGET_MS;
    let generated: z.infer<typeof generationSchema> | null = null;
    let generatedWithModel = modelChain[0];
    let lastError: unknown = null;

    for (const [index, modelName] of modelChain.entries()) {
      const remaining = deadline - Date.now();
      if (remaining <= 500) break;
      const attemptCap = Math.min(
        remaining,
        index === 0 ? GEN_ATTEMPT_TIMEOUT_MS : FALLBACK_ATTEMPT_TIMEOUT_MS,
      );
      try {
        const result = await generateObject({
          model: googleProvider(modelName),
          schema: zodSchema(generationSchema),
          system: SYSTEM_PROMPT,
          prompt: `عنوان المتن: ${matn.title}\nعدد الأسئلة المطلوب: ${questionCount}\nالأنواع المحددة فقط: ${selectedTypes.join(" / ")}\n\nنص المتن:\n${fullText}\n\nولّد ${questionCount} سؤالًا من هذا المتن باستخدام الأنواع المحددة فقط، ووزّعها بينها بالتساوي. يجب أن يظهر كل نوع محدد مرة واحدة على الأقل.`,
          // No SDK retries (same as grade-matn): a retry against a stalled
          // model multiplies its wait and blows past maxDuration, and the
          // abort signal must never be able to cancel a retry delay.
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(attemptCap),
        });
        generated = result.object;
        generatedWithModel = modelName;
        break;
      } catch (error) {
        lastError = error;
        // Model produced text but wrapped/invalid JSON -> strip fences & parse.
        const salvaged = salvageGeneratedQuestions(error);
        if (salvaged) {
          generated = salvaged;
          generatedWithModel = modelName;
          break;
        }
        console.error("GEMINI_GENERATION_ERROR:", { modelName, error });
      }
    }

    if (!generated) {
      // Every model in the chain failed -> graceful JSON with sanitized details
      // instead of masking everything behind a generic network message.
      return NextResponse.json(
        {
          error: "تعذر الاتصال بخدمة التوليد الذكي، حاول مجددًا",
          details: getErrorMessage(lastError),
        },
        { status: 502 },
      );
    }

    // Validate structure explicitly before returning anything to the client.
    const validatedGeneration = generationSchema.safeParse(generated);
    if (!validatedGeneration.success) {
      console.error(
        "GEMINI_GENERATION_ERROR: invalid structure",
        validatedGeneration.error.issues,
      );
      return NextResponse.json(
        { error: "أعاد النموذج بيانات غير صالحة، حاول مجددًا" },
        { status: 502 },
      );
    }

    let questions = normalizeQuestions(
      validatedGeneration.data.questions,
      questionCount,
      selectedTypes,
    );
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "لم يتمكن النموذج من استخراج أسئلة صالحة من هذا النص، حاول بنص مختلف" },
        { status: 502 },
      );
    }
    questions = await reviewQuestions(questions, generatedWithModel, googleProvider, deadline);

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
    console.error("GEMINI_GENERATION_ERROR:", error);
    return NextResponse.json(
      { error: "تعذر توليد الأسئلة حاليًا، حاول مجددًا" },
      { status: 500 },
    );
  }
}
