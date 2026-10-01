import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Dynamic client-side fetch of the signed-in user's profile preferences
// (JWT sessions go stale on update, so the client reads the live value
// instead of trusting the session payload).
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, notificationSoundEnabled: true },
    });
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({
      name: user.fullName,
      notificationSoundEnabled: user.notificationSoundEnabled,
    });
  } catch (error) {
    console.error("[profile] failed to load profile preferences", userId, error);
    return NextResponse.json({ error: "تعذر جلب بيانات الحساب، حاول مجددًا" }, { status: 500 });
  }
}

// Updates the signed-in user's own profile. Accepts `name` and/or
// `notificationSoundEnabled`; at least one field is required.
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
  const { name, notificationSoundEnabled } = body as {
    name?: unknown;
    notificationSoundEnabled?: unknown;
  };

  const data: { fullName?: string; notificationSoundEnabled?: boolean } = {};
  if (name !== undefined) {
    if (typeof name !== "string") {
      return NextResponse.json({ error: "الاسم غير صالح" }, { status: 400 });
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 100) {
      return NextResponse.json({ error: "الاسم غير صالح" }, { status: 400 });
    }
    data.fullName = trimmedName;
  }
  if (notificationSoundEnabled !== undefined) {
    if (typeof notificationSoundEnabled !== "boolean") {
      return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
    }
    data.notificationSoundEnabled = notificationSoundEnabled;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { fullName: true, notificationSoundEnabled: true },
    });
    return NextResponse.json({
      success: true,
      name: user.fullName,
      notificationSoundEnabled: user.notificationSoundEnabled,
    });
  } catch (error) {
    console.error("[profile] failed to update profile", userId, error);
    return NextResponse.json({ error: "تعذر حفظ التغييرات، حاول مجددًا" }, { status: 500 });
  }
}
