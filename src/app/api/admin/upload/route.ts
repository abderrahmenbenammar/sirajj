import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin, getStorageBucketUrl } from "@/lib/supabase-storage";
import { UPLOAD_RULES, isUploadKind } from "@/lib/upload-rules";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    const rule = isUploadKind(kind) ? UPLOAD_RULES[kind] : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
    }
    if (!rule) {
      return NextResponse.json({ error: "نوع الرفع غير صحيح" }, { status: 400 });
    }
    if (!rule.types.has(file.type)) {
      return NextResponse.json({ error: `نوع الملف غير مسموح: ${file.type || "غير معروف"}` }, { status: 415 });
    }
    if (file.size > rule.maxSize) {
      return NextResponse.json({ error: `حجم الملف أكبر من الحد المسموح (${Math.round(rule.maxSize / 1024 / 1024)}MB)` }, { status: 413 });
    }

    const extension = (file.name.split(".").pop() || "").toLowerCase() || (file.type === "image/png" ? "png" : "bin");
    const filename = `${randomUUID()}.${extension}`;
    const filePath = filename;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await getSupabaseAdmin().storage
      .from(rule.bucket)
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`[admin/upload] supabase upload failed (bucket=${rule.bucket}): ${uploadError.message}`);
      return NextResponse.json({ error: `فشل رفع الملف: ${uploadError.message}` }, { status: 500 });
    }

    const publicUrl = getStorageBucketUrl(rule.bucket, filePath);
    return NextResponse.json({ url: publicUrl, name: file.name });
  } catch (error) {
    // Never let an exception escape as an empty HTML 500: the client falls back
    // to a generic string whenever the response is not JSON.
    console.error("[admin/upload]", error);
    const message = error instanceof Error ? error.message : null;
    return NextResponse.json({ error: message || "فشل الرفع بسبب خطأ في الخادم" }, { status: 500 });
  }
}
