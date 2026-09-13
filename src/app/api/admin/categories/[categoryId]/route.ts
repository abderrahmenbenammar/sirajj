import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ categoryId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { categoryId } = await params;
  if (!UUID_RE.test(categoryId)) return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
  const body = await request.json();
  const slug = asText(body.slug);
  if (slug !== null && !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "صيغة slug غير صالحة" }, { status: 400 });
  }
  try {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        nameAr: asText(body.nameAr) ?? undefined,
        nameEn: asText(body.nameEn) ?? undefined,
        slug: slug ?? undefined,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "slug مستخدم مسبقًا" }, { status: 409 });
    }
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { categoryId } = await params;
  if (!UUID_RE.test(categoryId)) return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
  try {
    // Schema semantics: linked courses/library items keep existing with
    // categoryId set to NULL (ON DELETE SET NULL) — nothing breaks.
    const [courses, libraryItems] = await Promise.all([
      prisma.course.count({ where: { categoryId } }),
      prisma.libraryItem.count({ where: { categoryId } }),
    ]);
    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ success: true, unlinkedCourses: courses, unlinkedLibraryItems: libraryItems });
  } catch {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
  }
}
