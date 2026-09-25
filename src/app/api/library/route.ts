import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_LIST_CACHE_HEADERS } from "@/lib/http-cache";

const LIBRARY_TYPES = ["book", "article", "research", "lecture"] as const;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asInt(value: unknown, fallback: number): number | null {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

// Public library listing over real library_items.
// Search uses case-insensitive matching (backed by pg_trgm indexes);
// type/category narrow the result. Paginated via take/skip.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = asText(searchParams.get("type"));
  const q = asText(searchParams.get("q"));
  const categoryId = asText(searchParams.get("categoryId"));
  const take = asInt(searchParams.get("take"), 50);
  const skip = asInt(searchParams.get("skip"), 0);

  if (type && !(LIBRARY_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "نوع العنصر غير صالح" }, { status: 400 });
  }
  if (take === null || take < 1 || take > 100 || skip === null || skip < 0) {
    return NextResponse.json({ error: "قيم التقسيم غير صالحة" }, { status: 400 });
  }
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const where = {
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { titleAr: { contains: q, mode: "insensitive" as const } },
            { titleEn: { contains: q, mode: "insensitive" as const } },
            { authorName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.libraryItem.count({ where }),
    prisma.libraryItem.findMany({
      where,
      include: { category: { select: { id: true, nameAr: true, nameEn: true } } },
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take,
      skip,
    }),
  ]);

  return NextResponse.json({
    total,
    items: rows.map((item) => ({
      id: item.id,
      type: item.type,
      titleAr: item.titleAr,
      titleEn: item.titleEn,
      authorName: item.authorName,
      descriptionAr: item.descriptionAr,
      descriptionEn: item.descriptionEn,
      contentUrl: item.contentUrl,
      categoryId: item.categoryId,
      categoryAr: item.category?.nameAr ?? null,
      categoryEn: item.category?.nameEn ?? null,
      coverImageUrl: item.coverImageUrl,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
    })),
  }, { headers: PUBLIC_LIST_CACHE_HEADERS });
}
