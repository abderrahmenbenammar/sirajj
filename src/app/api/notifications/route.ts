import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_NOTIFICATIONS = 30;

// Latest notifications for the signed-in user. A failed read (e.g. the
// notifications table not migrated yet) must never break the navbar: log
// and return an empty list instead.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    });

    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[notifications] failed to load notifications", userId, error);
    return NextResponse.json({ notifications: [] });
  }
}
