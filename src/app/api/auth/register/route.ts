import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAuthToken, sendAuthEmail } from "@/lib/auth-mail";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!name || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) return NextResponse.json({ error: "البريد مستخدم مسبقًا" }, { status: 409 });

  const { rawToken, tokenHash } = createAuthToken();
  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      tokens: { create: { token: tokenHash, type: "EMAIL_VERIFICATION", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
    },
  });

  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/verify-email?token=${rawToken}&user=${user.id}`;
  await sendAuthEmail(user.email, "تأكيد البريد الإلكتروني في سراج", url);
  return NextResponse.json({ success: true });
}
