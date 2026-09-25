import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminAnalytics } from "@/lib/admin-analytics";

// Admin-only learning analytics over tables the platform already writes.
// ADMIN-only via requireAdmin (fresh DB role check); no CDN caching —
// this response is per-admin sensitive data, always computed live.
export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  try {
    const analytics = await getAdminAnalytics();
    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json({ error: "تعذر تحميل التحليلات" }, { status: 500 });
  }
}
