import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { session: null, response: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) };
  }
  return { session, response: null };
}
