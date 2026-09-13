import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public FAQ list in display order.
export async function GET() {
  const faqs = await prisma.faq.findMany({
    orderBy: [{ category: "asc" }, { orderIndex: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(faqs);
}
