import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, _count: { select: { enrollments: true, progress: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}
