import { NextResponse } from "next/server";
import { generateObject, zodSchema } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { consumeApiRateLimit } from "@/lib/api-rate-limit";
import { normalizeArabicText } from "@/lib/text-normalization";

// AI grading can take longer than the default serverless budget (10s).
export const maxDuration = 30;

const PASS_THRESHOLD = 85;
const MAX_TEXT_LENGTH = 2000;
const MAX_AI_GRADES_PER_HOUR = 30;

const gradeResultSchema = z.object({
  isPassed: z
    .boolean()
    .describe("true when the memorization score is 85 or higher, false otherwise"),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "0-100 score based on the core matn's substantive accuracy. MUST be exactly 100 when the core matn is complete and correct, even with additional accurate Islamic/scientific insights, Quran/Hadith proofs, or surah/ayah citations, and even when ordinal/structural prefixes are omitted. Accurate additions never lower the score. Deduct only for materially missing/wrong core text, demonstrably false added information or Quranic attribution, or a fundamental change of meaning. Minor spelling/keyboard differences also never reduce the score.",
    ),
  feedback: z
    .string()
    .describe(
      "Praising, encouraging Arabic feedback in 1-3 simple sentences. For a complete correct core matn with accurate added insights/proofs/citations, praise both the complete memorization and useful additions. Explain only material core-text defects or demonstrably false additions. Do not criticize omitted prefixes or accurate extra content; for a complete answer affirm that it is correct.",
    ),
});

export type GradeMatnResult = z.infer<typeof gradeResultSchema>;

const SYSTEM_PROMPT = `أنت "مُحفِّظ متون" عادل ودقيق. قيّم إجابة الطالب بحسب صحة نص المتن الأساسي ومعناه الإسلامي أو العلمي.

أولوية التقييم الدلالي والواقعي:
- قيّم اكتمال وصحة المتن الأساسي أولًا؛ لا تجعل شكل الإجابة أو طولها أو مقارنتها الحرفية بالنص معيارًا للخصم.
- اقبل الصياغة البديلة متى حافظت على المعنى الإسلامي الدقيق والحقيقة المقصودة؛ الصياغة المكافئة الصحيحة تستحق score = 100.
- اعتبر اختلاف ترتيب الكلمات أو التعبير مقبولًا إذا لم يغيّر المعنى أو يحذف جزءًا جوهريًا من المتن.

قاعدة الإضافات الصحيحة (score = 100 عند اكتمال المتن):
- إذا ذكر الطالب المتن الأساسي كاملًا وصحيحًا، فامنحه 100% حتى لو أضاف معلومات إسلامية أو علمية صحيحة، أو شرحًا وسياقًا علميًا، أو دليلًا من القرآن أو الحديث، أو توثيقًا دقيقًا مثل «سورة محمد: الآية 9» أو «إجماعًا».
- الإضافات الصحيحة إثراء وفهم، وليست أخطاء حفظ ولا سببًا للخصم مهما اختلفت عن النص المرجعي أو زادت عليه.
- إذا أضاف دليلًا أو معلومة، فتحقّق من صحتها بحسب ما يظهر من النص. لا تخصم بسبب إضافة إلا إذا كانت تخالف حقيقة شرعية/علمية أو تنسب نصًا قرآنيًا أو حديثيًا أو رقم آية على نحو خاطئ بوضوح. لا تخمّن الخطأ عند عدم اليقين.
- عندما يكون المتن كاملًا والإضافات دقيقة، اجعل score = 100 وامدح الحفظ والإثراء معًا؛ لا تخصم لأن الإجابة أطول من النص المرجعي.

تجاهل البادئات البنيوية تمامًا:
- أرقام الترتيب والتسميات التنظيمية مثل «الأول:»، «الخامس:»، «العاشر:»، «الناقض الأول:»، «الشرط الثالث:»، «المسألة الأولى:» هي عناوين وفهارس وليست من صلب المتن.
- لا تخصم أي نقطة إذا حذف الطالب رقمًا ترتيبيًا أو تسمية بنيوية موجودة في النص الصحيح، سواء جاءت في بداية الإجابة أو قبل بندٍ فيها.
- إذا كان المتن الأساسي كاملًا وصحيحًا بعد تجاهل هذه البادئة، فامنح score = 100. لا تذكر حذف البادئة بوصفه خطأ في feedback.

معيار الدرجة الكاملة (score = 100):
- نص المتن الأساسي ومعناه صحيحان ومكتملان. لا تشترط وجود دليل إضافي غير داخل في صلب المتن؛ وإذا أضاف الطالب دليلًا صحيحًا فعدّه إثراءً يستحق الثناء لا الخصم.
- صياغة بديلة تحفظ المعنى الإسلامي والحقيقة بدقة، أو إضافة علم صحيح، أو حذف بادئة تنظيمية غير جوهرية، لا يمنع الدرجة الكاملة.
- الأخطاء المطبعية الطفيفة واختلافات لوحة المفاتيح (تكرار حرف، المسافات، اختلاف الهمزات، أو خطأ إملائي لا يغيّر المعنى) لا تخفّض الدرجة.

الخصم مسموح فقط لهذه الأخطاء الفعلية:
- جزء جوهري من المتن الأساسي ناقص أو محرّف أو مستبدل بما يغيّر مضمونه.
- معلومة إضافية تناقض حقيقة إسلامية أو علمية، أو نص قرآني/حديثي أو نسبة آية أضافها الطالب غير صحيحة بوضوح.
- تغيّر المعنى الإسلامي الأساسي تغييرًا جوهريًا.
- لا تخصم بسبب أي معلومة إضافية صحيحة، أو اختلاف لفظي مكافئ، أو حذف بادئة ترتيبية، أو شيء لم يرد في النص المرجعي. اجعل الخصم متناسبًا مع الخطأ الفعلي، ولا تخمّن وجوده.

سلّم الدرجات (للمحتوى والمعرفة فقط):
- 100: المتن الأساسي كامل وصحيح؛ يشمل ذلك الصياغة المكافئة، والإضافات الصحيحة، وتجاهل البادئات البنيوية.
- 90-99: نقص صغير غير جوهري في المتن لا يغيّر المعنى.
- 85-89: حذف أو خطأ محدود في نقطة غير محورية.
- 70-84: جزء أساسي واحد ناقص أو محرّف.
- 50-69: عدة أجزاء جوهرية ناقصة أو غير صحيحة.
- 0-49: الإجابة مختلفة جوهريًا أو ناقصة أجزاء كبيرة أو شبه فارغة.
- isPassed يكون true فقط عندما تكون score أكبر من أو يساوي 85.
- اكتب feedback باللغة العربية الفصحى المبسطة، مشجّعًا وإيجابيًا، من جملة إلى ثلاث جمل. إذا كان المتن تامًا وأضاف الطالب دليلًا أو توثيقًا أو فائدة صحيحة، فامدح الإضافة والحفظ؛ مثال: «ممتاز! حفظك للمتن تام 100%، وإضافتك للدليل ورقم الآية تدل على فهم واستيعاب ممتاز.» لا تنتقد البادئات المحذوفة ولا الإضافات الصحيحة. اشرح الأخطاء الجوهرية أو المعلومات المضافة الخاطئة فقط.`;

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لاستخدام التصحيح" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (user?.status !== "ACTIVE") {
      return NextResponse.json({ error: "الحساب غير نشط" }, { status: 403 });
    }

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

    const rateLimit = await consumeApiRateLimit({
      userId,
      route: "grade-matn",
      limit: MAX_AI_GRADES_PER_HOUR,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "تجاوزت الحد المؤقت للتصحيح. حاول مجددًا بعد قليل" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
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
