import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createAuthToken, sendAuthEmail } from "@/lib/auth-mail";

export async function POST(request: Request) {
  const { email } = await request.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    await prisma.authToken.deleteMany({ where: { userId: user.id, type: "PASSWORD_RESET" } });
    const { rawToken, tokenHash } = createAuthToken();
    await prisma.authToken.create({ data: { token: tokenHash, type: "PASSWORD_RESET", userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/auth/reset-password?token=${rawToken}`;
    await sendAuthEmail(user.email, "إعادة تعيين كلمة المرور في سراج", url);
  }

  return NextResponse.json({ success: true });
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
