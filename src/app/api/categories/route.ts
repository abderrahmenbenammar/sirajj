import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public category list (used by library filters and admin forms).
export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { nameAr: "asc" } });
  return NextResponse.json(categories);
}
