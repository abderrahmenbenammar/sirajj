import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  // Optional case-insensitive search over real stored fields only.
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] }
      : undefined,
    select: {
      id: true,
      fullName: true,
      email: true,
      authProvider: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { courseProgress: true, certificates: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}
