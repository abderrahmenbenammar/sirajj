import { prisma } from "@/lib/prisma";

// Automatic course-duration engine. Durations are stored in whole seconds:
//  - YouTube lessons: resolved server-side via the Data API and cached per
//    video ID (shared by every lesson embedding the same video).
//  - Hosted/file lessons: length captured from the file itself and sent with
//    the lesson payload (the server only validates, never probes media).
//  - Anything else (empty URL, pasted non-YouTube link, unfetchable video):
//    NULL, excluded from totals. Public pages never touch YouTube — only
//    lesson writes and the explicit admin refresh resolve durations.

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// All URL shapes the project plays (watch, youtu.be, embed, /v/, /shorts/)
// plus /live/ and youtube-nocookie embeds. Returns null when no valid id.
export function extractYoutubeId(rawUrl: string): string | null {
  const url = (rawUrl ?? "").trim();
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const parts = parsed.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") {
    id = parts[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    id = parsed.searchParams.get("v");
    if (!id && parts[0] === "embed" && parts[1]) id = parts[1];
    else if (!id && (parts[0] === "v" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) id = parts[1];
  } else if (host === "youtube-nocookie.com" && parts[0] === "embed" && parts[1]) {
    id = parts[1];
  }
  if (!id) return null;
  // Strip any trailing junk the pathname split may have kept (? and # never
  // reach pathname, but guard anyway).
  id = id.split(/[?#]/)[0];
  return YT_ID_RE.test(id) ? id : null;
}

// ISO 8601 durations as returned by contentDetails.duration
// (PnW | PnDTnHnMnS with weeks/days optional). Returns whole seconds.
export function parseIso8601Duration(value: string): number | null {
  if (typeof value !== "string" || !value.startsWith("P")) return null;
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value);
  if (!m) return null;
  const weeks = Number(m[1] ?? 0);
  const days = Number(m[2] ?? 0);
  const hours = Number(m[3] ?? 0);
  const minutes = Number(m[4] ?? 0);
  const seconds = Number(m[5] ?? 0);
  if ([weeks, days, hours, minutes, seconds].some((n) => !Number.isFinite(n) || n < 0)) return null;
  return Math.floor(weeks * 604800 + days * 86400 + hours * 3600 + minutes * 60 + seconds);
}

const YT_API_DEFAULT = "https://www.googleapis.com/youtube/v3/videos";

// Overridable for self-hosted proxies/mirrors (tests point it at a local
// mock). Production default is the official endpoint above.
function youtubeEndpoint(): string {
  const custom = (process.env.YOUTUBE_API_BASE ?? "").trim().replace(/\/+$/, "");
  return custom || YT_API_DEFAULT;
}

// One videos.list call for up to 50 ids. Never throws: failures resolve to
// null per id (logged server-side). Test seam: custom endpoint for the mock.
export async function fetchYoutubeDurations(
  videoIds: string[],
  apiKey: string,
  endpoint: string = YT_API_DEFAULT
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  const ids = [...new Set(videoIds)].filter(Boolean);
  if (ids.length === 0 || !apiKey) return result;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const url = `${endpoint}?part=contentDetails&id=${batch.map(encodeURIComponent).join(",")}&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[certificates/youtube] videos.list failed", response.status, batch);
        continue;
      }
      const body = (await response.json()) as {
        items?: { id?: string; contentDetails?: { duration?: string } }[];
      };
      const seen = new Set<string>();
      for (const item of body.items ?? []) {
        if (!item?.id) continue;
        seen.add(item.id);
        const seconds = item.contentDetails?.duration
          ? parseIso8601Duration(item.contentDetails.duration)
          : null;
        result.set(item.id, seconds);
      }
      for (const id of batch) {
        if (!seen.has(id)) result.set(id, null); // unknown/private/deleted
      }
    } catch (error) {
      console.error("[certificates/youtube] videos.list error", error);
    }
  }
  return result;
}

// Cached single-video lookup. Durations are immutable, so a stored row
// (including NULL = "fetched but unavailable") is reused forever; only a
// missing row — or an explicit force — hits the network.
export async function getYoutubeDuration(videoId: string, forceRefresh = false): Promise<number | null> {
  if (!forceRefresh) {
    const cached = await prisma.youtubeVideoDuration.findUnique({ where: { videoId } });
    if (cached) return cached.durationSeconds;
  }
  const apiKey = process.env.YOUTUBE_API_KEY ?? "";
  if (!apiKey) return null;
  const fetched = await fetchYoutubeDurations([videoId], apiKey, youtubeEndpoint());
  const seconds = fetched.has(videoId) ? (fetched.get(videoId) ?? null) : null;
  await prisma.youtubeVideoDuration.upsert({
    where: { videoId },
    update: { durationSeconds: seconds, fetchedAt: new Date() },
    create: { videoId, durationSeconds: seconds },
  });
  return seconds;
}

// Client-reported file length: whole seconds, 0..86400 (24h cap).
export function asVideoSeconds(value: unknown): number | null | "INVALID" {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0 || n > 86400) return "INVALID";
  return n;
}

// Resolve a lesson's duration: YouTube URLs go through the API+cache
// (client values ignored); anything else trusts the validated file length
// or resolves to null (unknown → excluded from totals).
export async function resolveLessonVideoDuration(
  videoUrl: string,
  clientSeconds: unknown = null,
  forceRefresh = false
): Promise<number | null | "INVALID"> {
  const url = (videoUrl ?? "").trim();
  if (!url) return null;
  const ytId = extractYoutubeId(url);
  if (ytId) return getYoutubeDuration(ytId, forceRefresh);
  return asVideoSeconds(clientSeconds);
}

export interface CourseDuration {
  totalSeconds: number | null;
  knownCount: number;
  lessonCount: number;
}

export type DurationReason =
  | "no-video"
  | "cached"
  | "file-length"
  | "needs-fetch"
  | "no-api-key"
  | "invalid-url"
  | "file-no-length";

export interface LessonDurationDiagnosis {
  id: string;
  titleAr: string;
  kind: "youtube" | "hosted" | "none";
  youtubeId: string | null;
  durationSeconds: number | null;
  reason: DurationReason;
}

// Read-only diagnosis of WHY each lesson contributes (or not) to the total.
// Used by the admin refresh endpoint, the issue-time log, and tests — it
// never writes and never hits the network.
export async function diagnoseCourseDuration(courseId: string): Promise<{
  totalSeconds: number | null;
  knownCount: number;
  lessonCount: number;
  lessons: LessonDurationDiagnosis[];
}> {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { id: true, titleAr: true, videoUrl: true, videoDurationSeconds: true },
    orderBy: { orderIndex: "asc" },
  });
  const hasKey = Boolean(process.env.YOUTUBE_API_KEY ?? "");
  let total = 0;
  let known = 0;
  const out: LessonDurationDiagnosis[] = [];
  for (const lesson of lessons) {
    const url = (lesson.videoUrl ?? "").trim();
    if (!url) {
      out.push({ id: lesson.id, titleAr: lesson.titleAr, kind: "none", youtubeId: null, durationSeconds: null, reason: "no-video" });
      continue;
    }
    let host = "";
    try {
      host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      host = "";
    }
    const isYoutubeHost =
      host === "youtu.be" ||
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com";
    const ytId = extractYoutubeId(url);
    if (isYoutubeHost || ytId) {
      if (!ytId) {
        out.push({ id: lesson.id, titleAr: lesson.titleAr, kind: "youtube", youtubeId: null, durationSeconds: null, reason: "invalid-url" });
        continue;
      }
      if (typeof lesson.videoDurationSeconds === "number") {
        total += lesson.videoDurationSeconds;
        known += 1;
        const cached = await prisma.youtubeVideoDuration.findUnique({ where: { videoId: ytId }, select: { videoId: true } });
        out.push({ id: lesson.id, titleAr: lesson.titleAr, kind: "youtube", youtubeId: ytId, durationSeconds: lesson.videoDurationSeconds, reason: cached ? "cached" : "needs-fetch" });
      } else {
        out.push({ id: lesson.id, titleAr: lesson.titleAr, kind: "youtube", youtubeId: ytId, durationSeconds: null, reason: hasKey ? "needs-fetch" : "no-api-key" });
      }
      continue;
    }
    if (/^(https?:)?\/\//i.test(url) || url.endsWith(".mp4")) {
      if (typeof lesson.videoDurationSeconds === "number") {
        total += lesson.videoDurationSeconds;
        known += 1;
        out.push({ id: lesson.id, titleAr: lesson.titleAr, kind: "hosted", youtubeId: null, durationSeconds: lesson.videoDurationSeconds, reason: "file-length" });
      } else {
        out.push({ id: lesson.id, titleAr: lesson.titleAr, kind: "hosted", youtubeId: null, durationSeconds: null, reason: "file-no-length" });
      }
      continue;
    }
    out.push({ id: lesson.id, titleAr: lesson.titleAr, kind: "hosted", youtubeId: null, durationSeconds: null, reason: "invalid-url" });
  }
  return { totalSeconds: known > 0 ? total : null, knownCount: known, lessonCount: lessons.length, lessons: out };
}

// Live sum over the course's lessons. totalSeconds is null when no lesson
// has a known duration (renderers fall back to "غير محددة").
export async function getCourseDuration(courseId: string): Promise<CourseDuration> {
  const rows = await prisma.lesson.findMany({
    where: { courseId },
    select: { videoDurationSeconds: true },
  });
  let total = 0;
  let known = 0;
  for (const row of rows) {
    if (typeof row.videoDurationSeconds === "number") {
      total += row.videoDurationSeconds;
      known += 1;
    }
  }
  return { totalSeconds: known > 0 ? total : null, knownCount: known, lessonCount: rows.length };
}
