import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

// Admin newsletter registry: read-only listing (subscriptions are never
// edited; duplicates are impossible by unique email).
export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: "desc" },
  });
  return NextResponse.json({ total: subscribers.length, subscribers });
}
