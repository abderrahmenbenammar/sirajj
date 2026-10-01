import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Saves (or re-saves) the browser's Web Push subscription for the
// signed-in user. Re-subscribing the same endpoint upserts one row, so a
// device never accumulates duplicates; if another account reuses the
// endpoint it is reassigned to the latest subscriber.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { endpoint, keys } = body as { endpoint?: unknown; keys?: unknown };
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2048) {
    return NextResponse.json({ error: "بيانات الاشتراك غير صالحة" }, { status: 400 });
  }
  if (typeof keys !== "object" || keys === null) {
    return NextResponse.json({ error: "بيانات الاشتراك غير صالحة" }, { status: 400 });
  }
  const { p256dh, auth: authSecret } = keys as { p256dh?: unknown; auth?: unknown };
  if (
    typeof p256dh !== "string" ||
    p256dh.length === 0 ||
    p256dh.length > 512 ||
    typeof authSecret !== "string" ||
    authSecret.length === 0 ||
    authSecret.length > 256
  ) {
    return NextResponse.json({ error: "بيانات الاشتراك غير صالحة" }, { status: 400 });
  }

  try {
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth: authSecret },
      update: { userId, p256dh, auth: authSecret },
    });
    return NextResponse.json({ success: true, id: subscription.id });
  } catch (error) {
    console.error("[push] failed to save subscription", userId, error);
    return NextResponse.json({ error: "تعذر حفظ الاشتراك، حاول مجددًا" }, { status: 500 });
  }
}
