import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const libraryTypes = ["BOOK", "ARTICLE", "RESEARCH", "LECTURE"] as const;

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  return NextResponse.json(await prisma.libraryItem.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { type, title, author, category, description, content, mediaUrl } = await request.json();
  if (!libraryTypes.includes(type) || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "بيانات عنصر المكتبة غير صحيحة" }, { status: 400 });
  }
  const item = await prisma.libraryItem.create({ data: { type, title: title.trim(), author: author || null, category: category || null, description: description || null, content: content || null, mediaUrl: mediaUrl || null } });
  return NextResponse.json(item, { status: 201 });
}
