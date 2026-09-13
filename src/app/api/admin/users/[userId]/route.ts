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
      fullName: true,
      email: true,
      authProvider: true,
      role: true,
      status: true,
      createdAt: true,
      courseProgress: {
        select: {
          completionPercentage: true,
          status: true,
          completedAt: true,
          course: { select: { id: true, titleAr: true } },
        },
        orderBy: { startedAt: "desc" },
      },
      lessonCompletions: {
        select: {
          completedAt: true,
          lesson: { select: { titleAr: true, orderIndex: true, course: { select: { titleAr: true } } } },
        },
        orderBy: { completedAt: "desc" },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "المشترك غير موجود" }, { status: 404 });
  return NextResponse.json(user);
}

const VALID_ROLES = ["STUDENT", "ADMIN"] as const;
const VALID_STATUSES = ["ACTIVE", "DISABLED"] as const;

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { userId } = await params;
  const body = await request.json();

  // Only explicit valid values are applied; forged or unknown fields are ignored.
  // The actor identity always comes from the server session, never the body.
  const data: { role?: string; status?: string } = {};
  if (typeof body.role === "string" && (VALID_ROLES as readonly string[]).includes(body.role)) {
    data.role = body.role;
  }
  if (typeof body.status === "string" && (VALID_STATUSES as readonly string[]).includes(body.status)) {
    data.status = body.status;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول صالحة للتحديث" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!target) return NextResponse.json({ error: "المشترك غير موجود" }, { status: 404 });

  const nextRole = data.role ?? target.role;
  const nextStatus = data.status ?? target.status;
  const removesAdmin =
    target.role === "ADMIN" && target.status === "ACTIVE" && (nextRole !== "ADMIN" || nextStatus !== "ACTIVE");
  if (removesAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: userId } },
    });
    if (otherAdmins === 0) {
      return NextResponse.json({ error: "لا يمكن إزالة آخر مسؤول نشط في النظام" }, { status: 403 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, fullName: true, email: true, authProvider: true, role: true, status: true, createdAt: true },
  });
  return NextResponse.json(updated);
}
