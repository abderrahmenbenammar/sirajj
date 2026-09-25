import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_LIST_CACHE_HEADERS } from "@/lib/http-cache";

// Public FAQ list in display order.
export async function GET() {
  const faqs = await prisma.faq.findMany({
    orderBy: [{ category: "asc" }, { orderIndex: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(faqs, { headers: PUBLIC_LIST_CACHE_HEADERS });
}
