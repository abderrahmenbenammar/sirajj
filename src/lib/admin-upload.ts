import type { UploadKind } from "./upload-rules";

interface PresignResponse {
  signedUrl?: string;
  path?: string;
  publicUrl?: string;
  error?: string;
}

// Centralized direct-upload helper (replaces the per-page FormData uploaders).
// Step 1: ask our API for a signed upload URL (validated server-side).
// Step 2: PUT the exact File bytes straight to Supabase Storage, bypassing
// Vercel's serverless payload limits entirely.
// Step 3: return the public URL so the rest of the app works unchanged.
// Every failure surfaces as a descriptive Arabic Error for the UI toast/dialog.
export async function uploadFileDirect(file: File, kind: UploadKind): Promise<string> {
  let presignRes: Response;
  try {
    presignRes = await fetch("/api/admin/upload/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, fileType: file.type, fileSize: file.size, kind }),
    });
  } catch {
    throw new Error("تعذر الاتصال بالخادم لتجهيز الرفع");
  }
  const presign = (await presignRes.json().catch(() => null)) as PresignResponse | null;
  if (!presignRes.ok || !presign?.signedUrl || !presign?.publicUrl) {
    throw new Error(presign?.error ?? `تعذر تجهيز الرفع (HTTP ${presignRes.status})`);
  }

  let uploadRes: Response;
  try {
    uploadRes = await fetch(presign.signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
  } catch {
    throw new Error("تعذر الاتصال بخدمة التخزين أثناء الرفع");
  }
  if (!uploadRes.ok) {
    throw new Error(`فشل رفع الملف إلى التخزين (HTTP ${uploadRes.status})`);
  }
  return presign.publicUrl;
}
