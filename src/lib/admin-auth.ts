import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { session: null, user: null, response: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) };
  }
  // Fresh database check on every call: the JWT role is only a hint.
  // Demoted or disabled users lose admin API access immediately,
  // even with a previously issued token.
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  if (!dbUser || dbUser.role !== "ADMIN" || dbUser.status !== "ACTIVE") {
    return { session: null, user: null, response: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) };
  }
  return { session, user: dbUser, response: null };
}
