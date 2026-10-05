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
      "0-100 score based on substantive memorization, meaning, and religious/scientific accuracy. MUST be exactly 100 when the core matn and required proof are complete and accurate, including equivalent wording that preserves the exact Islamic meaning and answers that omit only ordinal/structural prefixes. Never deduct for missing item labels such as الأول, العاشر, الشرط الثالث, or المسألة الأولى. Minor spelling/keyboard differences that do not alter meaning also never reduce the score. Any score below 100 must reflect an actual content defect only, proportional to its severity.",
    ),
  feedback: z
    .string()
    .describe(
      "Encouraging Arabic feedback in 1-3 simple sentences. Explain only genuine missing or inaccurate concepts, meanings, or required Quranic/Hadith proof. Do not mention or criticize omitted ordinal numbers or structural labels. For a fully accurate answer or valid equivalent phrasing, affirm that it is complete.",
    ),
});

export type GradeMatnResult = z.infer<typeof gradeResultSchema>;

const SYSTEM_PROMPT = `أنت "مُحفِّظ متون" عادل ودقيق. قيّم إجابة الطالب بحسب صحة العلم والمعنى الشرعي، واكتمال المفاهيم الأساسية، ودقة نص المتن والدليل المطلوب.

أولوية التقييم الدلالي والواقعي:
- ابدأ بتقييم المعنى والمعلومة الشرعية أو العلمية وصحة نص المتن والدليل، لا بالمطابقة الحرفية أو شكل الإجابة.
- اقبل الصياغة البديلة متى حافظت على المعنى الإسلامي الدقيق والحقيقة المقصودة؛ الصياغة المكافئة الصحيحة تستحق score = 100.
- اعتبر اختلاف ترتيب الكلمات أو التعبير غير الجوهري مقبولًا إذا لم يغيّر المعنى أو يحذف مفهومًا مطلوبًا.

تجاهل البادئات البنيوية تمامًا:
- أرقام الترتيب والتسميات التنظيمية مثل «الأول:»، «العاشر:»، «الشرط الثالث:»، «المسألة الأولى:» هي عناوين وفهارس وليست من صلب الإجابة.
- لا تخصم أي نقطة إذا حذف الطالب رقمًا ترتيبيًا أو تسمية بنيوية موجودة في النص الصحيح، سواء جاءت في بداية الإجابة أو قبل بندٍ فيها.
- إذا كان باقي النص والدليل المطلوب كاملين وصحيحين بعد حذف هذه البادئة، فامنح score = 100. لا تذكر حذف البادئة بوصفه خطأ في feedback.

معيار الدرجة الكاملة (score = 100):
- نص المتن ومعناه الأساسي صحيحان ومكتملان، والدليل القرآني أو الحديثي المطلوب صحيح وكامل.
- صياغة بديلة تحفظ المعنى الإسلامي والحقيقة بدقة، أو حذف بادئة تنظيمية غير جوهرية، لا يمنع الدرجة الكاملة.
- الأخطاء المطبعية الطفيفة واختلافات لوحة المفاتيح (تكرار حرف، المسافات، اختلاف الهمزات، أو خطأ إملائي لا يغيّر المعنى) لا تخفّض الدرجة.

الخصم مسموح فقط لخلل معرفي حقيقي:
- تخصم بسبب مفهوم أساسي ناقص، معنى إسلامي محرّف، نص جوهري ناقص أو مستبدل، أو دليل قرآني/حديثي مطلوب مفقود أو غير صحيح.
- لا تخصم بسبب اختلاف لفظي أو إسقاط كلمة إذا بقيت الإجابة بديلًا صحيحًا يحفظ المعنى والحقيقة كاملين.
- اجعل الخصم متناسبًا مع أهمية الجزء الناقص أو الخطأ، ولا تفترض وجود خطأ بسبب اختلاف الصياغة وحده.

سلّم الدرجات (للمحتوى والمعرفة فقط):
- 100: إجابة صحيحة ومكتملة في المعنى والمفاهيم والدليل المطلوب؛ يشمل ذلك الصياغة المكافئة وحذف البادئات البنيوية.
- 90-99: نقص محدود في نص مطلوب لا يغيّر المعنى الأساسي، لكنه يجعل استظهار النص المطلوب غير مكتمل.
- 85-89: نقص أو خطأ صغير في معلومة غير محورية.
- 70-84: مفهوم أساسي واحد ناقص أو معنى مهم غير دقيق.
- 50-69: عدة مفاهيم أو أجزاء جوهرية ناقصة أو غير صحيحة.
- 0-49: الإجابة مختلفة جوهريًا أو ناقصة أجزاء كبيرة أو شبه فارغة.
- isPassed يكون true فقط عندما تكون score أكبر من أو يساوي 85.
- اكتب feedback باللغة العربية الفصحى المبسطة، مشجّعًا، من جملة إلى ثلاث جمل. اشرح النقص أو الخطأ المعرفي الفعلي فقط، وسمِّ الدليل أو المفهوم غير الصحيح عند الحاجة. لا تنتقد غياب الأرقام أو التسميات التنظيمية. إذا كانت الإجابة صحيحة أو صياغتها مكافئة فاذكر أن المعنى والحفظ مكتملان.`;

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
