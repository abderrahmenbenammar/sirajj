import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const libraryTypes = ["book", "article", "research", "lecture"] as const;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  return NextResponse.json(await prisma.libraryItem.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  // v2 stores lowercase types; legacy UPPERCASE values are normalized.
  const type = String(body.type ?? "").toLowerCase();
  // Legacy `title` accepted as alias for titleAr (falls back to titleEn too).
  const titleAr = asText(body.titleAr) ?? asText(body.title);
  if (!libraryTypes.includes(type as (typeof libraryTypes)[number]) || !titleAr) {
    return NextResponse.json({ error: "بيانات عنصر المكتبة غير صحيحة" }, { status: 400 });
  }
  // Legacy free-text `category` is resolved to a Category when it matches one.
  let categoryId = asText(body.categoryId);
  const categoryText = asText(body.category);
  if (!categoryId && categoryText) {
    const found = await prisma.category.findFirst({
      where: { OR: [{ nameAr: categoryText }, { nameEn: categoryText }, { slug: categoryText.toLowerCase().replace(/\s+/g, "-") }] },
      select: { id: true },
    });
    categoryId = found?.id ?? null;
  } else if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 400 });
  }
  const publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
  const item = await prisma.libraryItem.create({
    data: {
      type,
      titleAr,
      titleEn: asText(body.titleEn) ?? titleAr,
      authorName: asText(body.authorName) ?? asText(body.author),
      descriptionAr: asText(body.descriptionAr) ?? asText(body.content),
      descriptionEn: asText(body.descriptionEn) ?? asText(body.description),
      contentUrl: asText(body.contentUrl) ?? asText(body.mediaUrl) ?? "",
      categoryId,
      coverImageUrl: asText(body.coverImageUrl),
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
