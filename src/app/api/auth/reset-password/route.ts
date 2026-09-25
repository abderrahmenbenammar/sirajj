import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { token, password } = await request.json();
  if (typeof token !== "string" || typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findFirst({ where: { token: tokenHash, used: false, expiresAt: { gt: new Date() } } });
  if (!resetToken) return NextResponse.json({ error: "الرابط غير صالح أو منتهي" }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
  ]);
  return NextResponse.json({ success: true });
}
