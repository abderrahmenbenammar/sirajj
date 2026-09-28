import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function normalizeBaseUrl(raw: string): string {
  return raw.startsWith("https://") ? raw : `https://${raw}`;
}

let cachedAdmin: SupabaseClient | null = null;

// Lazy singleton: creating the client inside the request handler (instead of
// at module import time) turns a missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// into a catchable, diagnosable JSON error instead of a module-level crash
// that surfaces as an empty HTML 500 ("upload failed") on every upload.
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const rawUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl || !serviceKey) {
    throw new Error("missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  cachedAdmin = createClient(normalizeBaseUrl(rawUrl), serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}

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
