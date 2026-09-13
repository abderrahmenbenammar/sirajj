import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ itemId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIBRARY_TYPES = ["book", "article", "research", "lecture"] as const;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveCategory(categoryId: unknown): Promise<string | null | "INVALID"> {
  if (categoryId === null || categoryId === undefined || categoryId === "") return null;
  if (typeof categoryId !== "string") return "INVALID";
  const found = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  return found ? categoryId : "INVALID";
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { itemId } = await params;
  if (!UUID_RE.test(itemId)) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  const body = await request.json();

  if (body.type !== undefined && !(LIBRARY_TYPES as readonly string[]).includes(String(body.type).toLowerCase())) {
    return NextResponse.json({ error: "نوع العنصر غير صالح" }, { status: 400 });
  }
  const categoryId = await resolveCategory(body.categoryId);
  if (categoryId === "INVALID") {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 400 });
  }

  try {
    const item = await prisma.libraryItem.update({
      where: { id: itemId },
      data: {
        type: body.type !== undefined ? String(body.type).toLowerCase() : undefined,
        titleAr: asText(body.titleAr) ?? asText(body.title) ?? undefined,
        titleEn: asText(body.titleEn) ?? undefined,
        authorName: asText(body.authorName) ?? asText(body.author) ?? undefined,
        descriptionAr: asText(body.descriptionAr) ?? undefined,
        descriptionEn: asText(body.descriptionEn) ?? asText(body.description) ?? undefined,
        contentUrl: asText(body.contentUrl) ?? asText(body.mediaUrl) ?? undefined,
        categoryId: body.categoryId === null || body.categoryId === "" ? null : (categoryId ?? undefined),
        coverImageUrl: asText(body.coverImageUrl) ?? undefined,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { itemId } = await params;
  if (!UUID_RE.test(itemId)) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  try {
    // Nothing references library_items, so deletion is always clean.
    await prisma.libraryItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  }
}
