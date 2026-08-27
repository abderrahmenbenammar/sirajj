import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const userId = searchParams.get("user");
  const tokenHash = token ? crypto.createHash("sha256").update(token).digest("hex") : null;
  const authToken = tokenHash && userId ? await prisma.authToken.findFirst({ where: { token: tokenHash, userId, type: "EMAIL_VERIFICATION", expiresAt: { gt: new Date() } } }) : null;

  if (!authToken) return NextResponse.json({ error: "رابط التحقق غير صالح أو منتهي" }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId! }, data: { emailVerified: new Date() } }),
    prisma.authToken.delete({ where: { id: authToken.id } }),
  ]);
  return NextResponse.redirect(new URL("/auth/login?verified=1", request.url));
}
