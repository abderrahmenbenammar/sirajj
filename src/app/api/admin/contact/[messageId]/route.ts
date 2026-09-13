import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type Context = { params: Promise<{ messageId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESSAGE_STATUSES = ["new", "read", "replied"] as const;

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { messageId } = await params;
  if (!UUID_RE.test(messageId)) return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
  const body = await request.json();
  if (typeof body.status !== "string" || !(MESSAGE_STATUSES as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: "الحالة غير صالحة" }, { status: 400 });
  }
  try {
    const message = await prisma.contactMessage.update({
      where: { id: messageId },
      data: { status: body.status },
    });
    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
  }
}
