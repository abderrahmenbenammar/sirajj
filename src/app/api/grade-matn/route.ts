import { NextResponse } from "next/server";
import { generateObject, zodSchema } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { normalizeArabicText } from "@/lib/text-normalization";

// AI grading can take longer than the default serverless budget (10s).
export const maxDuration = 30;

const PASS_THRESHOLD = 85;
const MAX_TEXT_LENGTH = 2000;

const gradeResultSchema = z.object({
  isPassed: z
    .boolean()
    .describe("true when the memorization score is 85 or higher, false otherwise"),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "0-100 memorization score. MUST be exactly 100 when memorization is complete and the only discrepancies are minor typographical/keyboard slips (repeated letter such as a doubled consonant, extra or missing space, hamza variance, or a small spelling typo that does not alter the meaning) — such slips must NEVER reduce the score. Any value below 100 must reflect genuine memorization defects only (missing words, wrong words that change meaning, transposed sentences, missing core concepts), proportional to their severity.",
    ),
  feedback: z
    .string()
    .describe(
      "Encouraging Arabic feedback in 1-3 simple sentences. For typo-only answers the score is 100: you may gently mention the typo while making clear the memorization is complete; otherwise name the missing or wrong words precisely.",
    ),
});

export type GradeMatnResult = z.infer<typeof gradeResultSchema>;

const SYSTEM_PROMPT = `أنت "مُحفِّظ متون" صارم لكن عادل، مهمتك تقييم حفظ الطالب للنصوص الشرعية.

قواعد التصحيح:
- النصان المعطيان مُنظَّفان مسبقًا (بدون تشكيل أو همزات متغيرة أو علامات ترقيم)، فقارن الكلمات جوهرًا بجوهر.
- ميزان واحد: عيوب الحفظ وحدها هي ما يُنقص الدرجة. الأخطاء المطبعية وأخطاء لوحة المفاتيح لا تُنقص الدرجة إطلاقًا.

قاعدة الدرجة الكاملة (score = 100 حتمًا):
- إذا كان حفظ الطالب كاملًا لمتن والمتن، والاختلافات الوحيدة أخطاء مطبعية طفيفة — كتكرار حرف (مثل «لللقبرر» بدل «للقبر»)، مسافة زائدة أو ناقصة، تغيّر همزي، أو خطأ إملائي صغير لا يغيّر المعنى الشرعي — فاجعل score = 100.
- لا تخصم أي درجة بسببها مهما كان عددها. يجوز أن تُشير إلى الخطأ المطبعي برفق في feedback، لكن score يجب أن يبقى 100.

قواعد الخصم (لا تُطبَّق إلا على عيوب الحفظ الحقيقية):
- اشترط تطابق الكلمات الأساسية في المتن؛ أي كلمة جوهرية ناقصة أو مبدَّلة، أو جملة مقلوبة، أو مفهوم ناقص — تُنقص الدرجة بقدر خطورته.

سلّم الدرجات (يعتمد على عيوب الحفظ فقط):
- 100: حفظ كامل للمتن؛ والأخطاء المطبعية لا تنزله أبدًا.
- 90-99: إسقاط أداة ربط أو حرف جر (مثل: و، في، من، إلى) مع بقاء المعنى سليمًا.
- 85-89: إسقاط أو تبديل كلمة طفيفة غير محورية مع بقاء المعنى.
- 70-84: كلمة جوهرية واحدة ناقصة أو مبدَّلة.
- 50-69: عدة كلمات ناقصة أو مبدَّلة، أو ترتيب معكوس جزئي.
- 0-49: الإجابة مختلفة جوهريًا أو ناقصة أجزاء كبيرة أو شبه فارغة.
- isPassed يكون true فقط عندما تكون score أكبر من أو يساوي 85.
- اكتب feedback باللغة العربية الفصحى المبسطة، مشجّعًا، من جملة إلى ثلاث جمل. إذا كان الخطأ مطبعيًا فقط فاذكره بلطف مع تقرير أن الحفظ متقن؛ وإذا كان عيب حفظ فاذكر الكلمات الناقصة أو المبدَّلة بالتحديد.`;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const studentAnswer = typeof body?.studentAnswer === "string" ? body.studentAnswer : "";
    const correctAnswer = typeof body?.correctAnswer === "string" ? body.correctAnswer : "";

    if (studentAnswer.trim().length === 0 || correctAnswer.trim().length === 0) {
      return NextResponse.json(
        { error: "إجابة الطالب والنص الصحيح مطلوبان" },
        { status: 400 },
      );
    }
    if (studentAnswer.length > MAX_TEXT_LENGTH || correctAnswer.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: "النص طويل جدًا" }, { status: 400 });
    }

    const cleanStudent = normalizeArabicText(studentAnswer);
    const cleanCorrect = normalizeArabicText(correctAnswer);

    if (cleanStudent.length === 0 || cleanCorrect.length === 0) {
      return NextResponse.json(
        { error: "تعذر قراءة النص بعد التنظيف" },
        { status: 400 },
      );
    }

    // Fast path: identical after normalization -> perfect score without an AI call
    // (works even when the AI service is unconfigured or down).
    if (cleanStudent === cleanCorrect) {
      const perfect: GradeMatnResult = {
        isPassed: true,
        score: 100,
        feedback: "ممتاز بارك الله فيك",
      };
      return NextResponse.json(perfect);
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "خدمة التصحيح غير مهيأة حاليًا" },
        { status: 503 },
      );
    }

    // Model failover chain: primary first, then fallbacks on any failure
    // (retired model, quota, transient network errors).
    // NOTE: gemini-2.0-flash and gemini-1.5-flash are 404-retired by Google,
    // so the fallback is gemini-3.5-flash-lite (Google's supported replacement).
    const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    const override = (process.env.GRADE_MATN_MODEL_CHAIN ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const modelChain = override.length > 0 ? override : DEFAULT_MODELS;

    // Hard budget under maxDuration=30 so exhausted attempts still return our
    // JSON instead of a platform-level timeout.
    const deadline = Date.now() + 24_000;
    let object: GradeMatnResult | null = null;

    for (const modelName of modelChain) {
      const remaining = deadline - Date.now();
      if (remaining <= 500) break;
      try {
        const generated = await generateObject({
          model: google(modelName),
          schema: zodSchema(gradeResultSchema),
          system: SYSTEM_PROMPT,
          prompt: `النص الصحيح:\n${cleanCorrect}\n\nإجابة الطالب:\n${cleanStudent}\n\nقيّم حفظ الطالب وأعد النتيجة.`,
          // SDK retries transient failures (429/5xx/network) with backoff;
          // permanent errors (404 dead model, 400) are not retried and fall
          // through to the next model instantly.
          maxRetries: modelName === modelChain[0] ? 3 : 1,
          abortSignal: AbortSignal.timeout(remaining),
        });
        object = generated.object;
        break;
      } catch (error) {
        // Log the failed attempt (with which model) and fail over.
        console.error("Grade Matn Error:", modelName, error);
      }
    }

    if (!object) {
      // Every model in the chain failed -> graceful JSON instead of a crash.
      return NextResponse.json(
        { error: "تعذر الاتصال بخدمة التصحيح الذكية، حاول مجددًا" },
        { status: 502 },
      );
    }

    // Single source of truth for the pass/fail rule (score >= 85).
    const score = Math.min(100, Math.max(0, Math.round(object.score)));
    const result: GradeMatnResult = {
      isPassed: score >= PASS_THRESHOLD,
      score,
      feedback: object.feedback,
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Grade Matn Error:", error);
    return NextResponse.json(
      { error: "تعذر التصحيح حاليًا، حاول مجددًا" },
      { status: 500 },
    );
  }
}
