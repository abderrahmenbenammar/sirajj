import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });

  const item = await prisma.libraryItem.findUnique({
    where: { id },
    include: { category: { select: { id: true, nameAr: true, nameEn: true } } },
  });
  if (!item) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });

  return NextResponse.json({
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
  });
}
