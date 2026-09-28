import { STORAGE_BUCKETS } from "./supabase-storage";

export type UploadKind = "image" | "video" | "document";

export function isUploadKind(value: unknown): value is UploadKind {
  return value === "image" || value === "video" || value === "document";
}

export interface UploadRule {
  types: ReadonlySet<string>;
  maxSize: number;
  bucket: string;
}

// Single source of truth for both upload paths:
// - POST /api/admin/upload (proxied, small files)
// - POST /api/admin/upload/presigned (direct-to-storage, large files)
// Server-side limits stay the backstop; the browser pre-checks smaller caps
// where the hosting platform imposes its own payload ceiling.
export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  image: {
    types: new Set(["image/jpeg", "image/png", "image/webp"]),
    maxSize: 10 * 1024 * 1024,
    bucket: STORAGE_BUCKETS.images,
  },
  video: {
    types: new Set(["video/mp4", "video/webm", "video/quicktime"]),
    maxSize: 250 * 1024 * 1024,
    bucket: STORAGE_BUCKETS.videos,
  },
  document: {
    types: new Set(["application/pdf", "text/plain"]),
    maxSize: 25 * 1024 * 1024,
    bucket: STORAGE_BUCKETS.documents,
  },
};
