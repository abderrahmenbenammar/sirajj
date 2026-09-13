import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const MESSAGE_STATUSES = ["new", "read", "replied"] as const;

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  if (status && !(MESSAGE_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "الحالة غير صالحة" }, { status: 400 });
  }
  const messages = await prisma.contactMessage.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(messages);
}
