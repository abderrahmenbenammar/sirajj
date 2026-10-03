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
    .describe("0-100: exactness of the memorization match"),
  feedback: z
    .string()
    .describe("Encouraging Arabic feedback naming missing words or minor mistakes"),
});

export type GradeMatnResult = z.infer<typeof gradeResultSchema>;

const SYSTEM_PROMPT = `أنت "مُحفِّظ متون" صارم لكن عادل، مهمتك تقييم حفظ الطالب للنصوص الشرعية.

قواعد التصحيح:
- النصان المعطيان مُنظَّفان مسبقًا (بدون تشكيل أو همزات متغيرة أو علامات ترقيم)، فقارن الكلمات جوهرًا بجوهر.
- اشترط تطابق الكلمات الأساسية في المتن تطابقًا تامًا؛ أي كلمة جوهرية ناقصة أو مبدَّلة تُنقص الدرجة بوضوح.
- تسامح فقط في: أخطاء إملائية طفيفة لا تغيّر المعنى (حرف واحد)، أو إسقاط أداة ربط/حرف جر (مثل: و، في، من، إلى) إذا بقي المعنى سليمًا.
- سلّم الدرجات هكذا:
  - 100: تطابق تام كلمة بكلمة.
  - 90-99: خطأ إملائي طفيف واحد لا يمس المعنى.
  - 85-89: إسقاط أداة ربط أو حرف جر مع بقاء المعنى.
  - 70-84: كلمة جوهرية ناقصة أو مبدَّلة واحدة.
  - 50-69: عدة كلمات ناقصة أو مبدَّلة.
  - 0-49: الإجابة مختلفة جوهريًا أو شبه فارغة.
- isPassed يكون true فقط عندما تكون score أكبر من أو تساوي 85.
- اكتب feedback باللغة العربية الفصحى المبسطة، مشجّعًا، من جملة إلى ثلاث جمل، واذكر فيه الكلمات الناقصة أو الأخطاء بالتحديد.`;

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

    let object: GradeMatnResult;
    try {
      const generated = await generateObject({
        model: google("gemini-3.8-flash"),
        schema: zodSchema(gradeResultSchema),
        system: SYSTEM_PROMPT,
        prompt: `النص الصحيح:\n${cleanCorrect}\n\nإجابة الطالب:\n${cleanStudent}\n\nقيّم حفظ الطالب وأعد النتيجة.`,
      });
      object = generated.object;
    } catch (error) {
      // Model call failed (quota, network, invalid response...) -> graceful JSON
      // fallback with an explicit status instead of an unhandled exception.
      console.error("Grade Matn Error:", error);
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
