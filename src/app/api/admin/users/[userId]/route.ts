import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      enrollments: { select: { createdAt: true, course: { select: { id: true, title: true, level: true } } }, orderBy: { createdAt: "desc" } },
      progress: { select: { completed: true, completedAt: true, lesson: { select: { title: true, position: true, course: { select: { title: true } } } } }, orderBy: { completedAt: "desc" } },
    },
  });
  if (!user) return NextResponse.json({ error: "المشترك غير موجود" }, { status: 404 });
  return NextResponse.json(user);
}
