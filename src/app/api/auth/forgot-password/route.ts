import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuthToken, sendAuthEmail } from "@/lib/auth-mail";

export async function POST(request: Request) {
  const { email } = await request.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    // Single-use hash-only tokens (see PasswordResetToken): invalidate previous unused ones.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });
    const { rawToken, tokenHash } = createAuthToken();
    await prisma.passwordResetToken.create({ data: { userId: user.id, token: tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/auth/reset-password?token=${rawToken}`;
    await sendAuthEmail(user.email, "إعادة تعيين كلمة المرور في سراج", url);
  }

  return NextResponse.json({ success: true });
}
