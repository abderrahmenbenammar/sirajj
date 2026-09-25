// Cache policy for public, low-change listings (courses, library,
// categories, FAQs). CDN-only freshness (s-maxage): browsers are unaffected,
// and admin mutations become visible within ~a minute via background
// revalidation. NEVER use this for user-specific, admin, auth, progress,
// attempt or certificate responses.
export const PUBLIC_LIST_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;
