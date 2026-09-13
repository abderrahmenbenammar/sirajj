import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.SUPABASE_URL!;
const supabaseUrl = rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const STORAGE_BUCKETS = {
  images: "siraj-images",
  documents: "siraj-documents",
  videos: "siraj-videos",
} as const;

export function getStorageBucketUrl(bucket: string, filePath: string): string {
  const rawBase = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const baseUrl = rawBase.startsWith("https://") ? rawBase : `https://${rawBase}`;
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/storage/v1/object/public/${bucket}/${filePath}`;
}
