import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// FCM tokens are long printable-ASCII strings (letters, digits, and symbols like : _ - = .).
const TOKEN_PATTERN = /^[\x21-\x7e]{10,4096}$/;
const PLATFORM_PATTERN = /^[A-Z0-9_]{1,32}$/;

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform =
      typeof body?.platform === "string" && body.platform.trim() !== ""
        ? body.platform.trim()
        : "ANDROID_FCM";
    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ error: "رمز الجهاز غير صالح" }, { status: 400 });
    }
    if (!PLATFORM_PATTERN.test(platform)) {
      return NextResponse.json({ error: "نوع الجهاز غير صالح" }, { status: 400 });
    }

    // Same token always maps to the newest owner (re-login on another phone reassigns it).
    await prisma.devicePushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, lastSeenAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[devices] failed to save device token", error);
    return NextResponse.json(
      { error: "تعذر حفظ رمز الجهاز، حاول مجددًا" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ error: "رمز الجهاز غير صالح" }, { status: 400 });
    }

    // Scoped to the caller so a user can only detach their own devices (idempotent).
    const { count } = await prisma.devicePushToken.deleteMany({
      where: { token, userId },
    });
    return NextResponse.json({ success: true, removed: count });
  } catch (error) {
    console.error("[devices] failed to remove device token", error);
    return NextResponse.json(
      { error: "تعذر حذف رمز الجهاز، حاول مجددًا" },
      { status: 500 },
    );
  }
}
