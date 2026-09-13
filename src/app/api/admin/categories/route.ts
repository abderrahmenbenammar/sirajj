import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  const nameAr = asText(body.nameAr);
  const nameEn = asText(body.nameEn);
  if (!nameAr || !nameEn) {
    return NextResponse.json({ error: "اسم التصنيف باللغتين مطلوب" }, { status: 400 });
  }
  const explicitSlug = asText(body.slug);
  const base = explicitSlug ?? slugify(nameEn);
  if (!base || !/^[a-z0-9-]+$/.test(base)) {
    return NextResponse.json({ error: "تعذر اشتقاق slug صالح — أدخل slug لاتينيًا" }, { status: 400 });
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      const category = await prisma.category.create({ data: { nameAr, nameEn, slug } });
      return NextResponse.json(category, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return NextResponse.json({ error: "تعذر إنشاء التصنيف — slug مستخدم" }, { status: 409 });
}
