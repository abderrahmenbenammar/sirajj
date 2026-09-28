import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin, getStorageBucketUrl } from "@/lib/supabase-storage";
import { UPLOAD_RULES, isUploadKind } from "@/lib/upload-rules";

export const runtime = "nodejs";

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

// Step 1 of direct upload: validate the file metadata and mint a signed
// upload URL. The browser PUTs the bytes straight to Supabase Storage
// (Step 2, client-side), so large files never pass through Vercel's
// serverless payload limits.
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "بيانات الطلب غير صحيحة" }, { status: 400 });
  }

  const { filename, fileType, fileSize, kind } = body;
  if (!isUploadKind(kind)) {
    return NextResponse.json({ error: "نوع الرفع غير صحيح" }, { status: 400 });
  }
  const rule = UPLOAD_RULES[kind];
  if (typeof fileType !== "string" || !rule.types.has(fileType)) {
    return NextResponse.json({ error: `نوع الملف غير مسموح: ${typeof fileType === "string" && fileType ? fileType : "غير معروف"}` }, { status: 415 });
  }
  if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > rule.maxSize) {
    return NextResponse.json(
      { error: `حجم الملف أكبر من الحد المسموح (${Math.round(rule.maxSize / 1024 / 1024)}MB)` },
      { status: 413 }
    );
  }

  // Only the extension suffix is reused; the name itself is a randomUUID, so
  // path traversal or collisions via crafted filenames are impossible.
  const rawExt = typeof filename === "string" ? (filename.split(".").pop() ?? "").toLowerCase() : "";
  const cleanExt = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : (EXTENSION_BY_MIME[fileType] ?? "bin");
  const filePath = `${randomUUID()}.${cleanExt}`;

  try {
    const { data, error } = await getSupabaseAdmin().storage.from(rule.bucket).createSignedUploadUrl(filePath);
    if (error || !data?.signedUrl) {
      console.error(`[admin/upload/presigned] sign failed (bucket=${rule.bucket}): ${error?.message ?? "no signedUrl returned"}`);
      return NextResponse.json({ error: `تعذر تجهيز الرفع: ${error?.message ?? "خطأ غير معروف"}` }, { status: 500 });
    }
    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      publicUrl: getStorageBucketUrl(rule.bucket, filePath),
    });
  } catch (error) {
    console.error("[admin/upload/presigned]", error);
    const message = error instanceof Error ? error.message : null;
    return NextResponse.json({ error: message || "فشل الرفع بسبب خطأ في الخادم" }, { status: 500 });
  }
}
