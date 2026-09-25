import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin, STORAGE_BUCKETS, getStorageBucketUrl } from "@/lib/supabase-storage";

export const runtime = "nodejs";

const rules = {
  image: { types: new Set(["image/jpeg", "image/png", "image/webp"]), maxSize: 10 * 1024 * 1024, bucket: STORAGE_BUCKETS.images },
  video: { types: new Set(["video/mp4", "video/webm", "video/quicktime"]), maxSize: 250 * 1024 * 1024, bucket: STORAGE_BUCKETS.videos },
  document: { types: new Set(["application/pdf", "text/plain"]), maxSize: 25 * 1024 * 1024, bucket: STORAGE_BUCKETS.documents },
} as const;

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");
  const rule = typeof kind === "string" && kind in rules ? rules[kind as keyof typeof rules] : null;

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

  // Extension is derived from the validated content type, never from the
  // client filename, so a deceptive name (e.g. ".html"/".svg") cannot
  // influence the stored object.
  const EXTENSION_BY_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "text/plain": "txt",
  };
  const extension = EXTENSION_BY_MIME[file.type] ?? "bin";
  const filename = `${randomUUID()}.${extension}`;
  const filePath = filename;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(rule.bucket)
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `فشل رفع الملف: ${uploadError.message}` }, { status: 500 });
  }

  const publicUrl = getStorageBucketUrl(rule.bucket, filePath);
  return NextResponse.json({ url: publicUrl, name: file.name });
}
