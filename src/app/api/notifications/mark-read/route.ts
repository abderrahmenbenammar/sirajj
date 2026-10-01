import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Marks notifications as read. Body: { id } marks a single notification,
// { unreadOnly: true } marks every unread notification of the user.
// Every update is scoped to the session user — one account can never
// touch another account's notifications.
export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { unreadOnly, id } = body as { unreadOnly?: unknown; id?: unknown };
  if (unreadOnly !== undefined && typeof unreadOnly !== "boolean") {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    if (id !== undefined) {
      if (typeof id !== "string" || !UUID_RE.test(id)) {
        return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
      }
      const result = await prisma.notification.updateMany({
        where: { id, userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true, updated: result.count });
    }

    if (unreadOnly !== true) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error("[notifications] failed to mark notifications read", userId, error);
    return NextResponse.json({ error: "تعذر تحديث الإشعارات، حاول مجددًا" }, { status: 500 });
  }
}
