import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_LIST_CACHE_HEADERS } from "@/lib/http-cache";

// Public category list (used by library filters and admin forms).
export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { nameAr: "asc" } });
  return NextResponse.json(categories, { headers: PUBLIC_LIST_CACHE_HEADERS });
}
