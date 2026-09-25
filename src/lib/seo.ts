// Shared SEO helpers (server-side only: metadata, sitemap, robots, JSON-LD).
// The canonical site URL comes from the environment so no hard-coded or
// localhost domain ever leaks into production metadata. Production MUST set
// NEXT_PUBLIC_SITE_URL (APP_URL is the local fallback chain).

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

// Resolve a possibly-relative image path (uploads, covers) to an absolute
// URL for Open Graph. Absolute URLs pass through untouched.
export function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = siteUrl();
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

// Seconds → ISO 8601 duration for schema.org (e.g. 9000 → "PT2H30M").
// Returns undefined for null/unspecified so the field is simply omitted.
export function secondsToISO8601Duration(totalSeconds: number | null | undefined): string | undefined {
  if (totalSeconds === null || totalSeconds === undefined) return undefined;
  const s = Math.max(0, Math.round(totalSeconds));
  if (s <= 0) return undefined;
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  let out = "PT";
  if (hours > 0) out += `${hours}H`;
  if (minutes > 0) out += `${minutes}M`;
  if (seconds > 0 || out === "PT") out += `${seconds}S`;
  return out;
}

// Trim long descriptions for meta/OG tags without cutting mid-word.
export function truncateText(text: string, maxLength = 170): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}
