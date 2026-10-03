import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// Server-side transcription can exceed the default serverless budget.
export const maxDuration = 30;

const MAX_AUDIO_BYTES = 8_000_000; // 8 MB inline audio cap

const TRANSCRIBE_PROMPT = `حوّل الصوت التالي إلى نص مكتوب. قواعدك:
- انقل الكلام المنطوق حرفيًا بالعربية الفصحى مع علامات ترقيم خفيفة عند الحاجة.
- إذا كان الصوت بلغة أخرى حوّله إلى العربية الفصحى.
- لا تلخّص ولا تشرح ولا تعلّق؛ أعد النص فقط دون أي مقدمة.
- إذا كان الصوت صامتًا أو غير مفهوم أعد نصًا فارغًا تمامًا.`;

export async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => null);
    const audio = form?.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "الملف الصوتي مفقود" }, { status: 400 });
    }
    if (audio.size === 0) {
      return NextResponse.json(
        { error: "التسجيل فارغ — تحدث أولًا ثم أعد المحاولة" },
        { status: 400 },
      );
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "التسجيل طويل جدًا (الحد 8 ميغابايت)" },
        { status: 400 },
      );
    }

    const mediaType = audio.type && audio.type.startsWith("audio/") ? audio.type : "audio/webm";
    const bytes = new Uint8Array(await audio.arrayBuffer());

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "خدمة التحويل الصوتي غير مهيأة حاليًا" },
        { status: 503 },
      );
    }

    // Model failover chain (same strategy as grade-matn): retired/quota-blocked
    // models fall through to the next entry.
    const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    const override = (process.env.TRANSCRIBE_MODEL_CHAIN ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const modelChain = override.length > 0 ? override : DEFAULT_MODELS;

    // Hard budget under maxDuration=30 so exhausted attempts still return our JSON.
    const deadline = Date.now() + 24_000;
    let text = "";
    let succeeded = false;

    for (const modelName of modelChain) {
      const remaining = deadline - Date.now();
      if (remaining <= 500) break;
      try {
        const generated = await generateText({
          model: google(modelName),
          messages: [
            {
              role: "user",
              content: [
                { type: "file", data: bytes, mediaType },
                { type: "text", text: TRANSCRIBE_PROMPT },
              ],
            },
          ],
          maxRetries: modelName === modelChain[0] ? 3 : 1,
          abortSignal: AbortSignal.timeout(remaining),
        });
        text = generated.text.trim();
        succeeded = true;
        break;
      } catch (error) {
        console.error("Transcribe Error:", modelName, error);
      }
    }

    if (!succeeded) {
      return NextResponse.json(
        { error: "تعذر تحويل الصوت إلى نص، حاول مجددًا" },
        { status: 502 },
      );
    }

    // Empty text = silence/no clear speech; the client shows a friendly retry hint.
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcribe Error:", error);
    return NextResponse.json(
      { error: "تعذر التحويل الصوتي حاليًا، حاول مجددًا" },
      { status: 500 },
    );
  }
}
