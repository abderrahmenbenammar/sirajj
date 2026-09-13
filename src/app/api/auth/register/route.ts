import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!name || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) return NextResponse.json({ error: "البريد مستخدم مسبقًا" }, { status: 409 });

  // v2 schema has no email-verification storage: accounts are usable right away.
  await prisma.user.create({
    data: {
      fullName: String(name).trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      authProvider: "email",
    },
  });

  return NextResponse.json({ success: true });
}
