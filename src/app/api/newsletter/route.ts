import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Newsletter subscription. Idempotent by email: an existing address is never
// duplicated (unique constraint is the backstop; we check first for a clear response).
// No email is sent at this stage by design.
export async function POST(request: Request) {
  const body = await request.json();
  const raw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!raw || !EMAIL_RE.test(raw)) {
    return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
  }

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: raw }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ success: true, subscribed: true, existed: true });
  }

  await prisma.newsletterSubscriber.create({ data: { email: raw } });
  return NextResponse.json({ success: true, subscribed: true, existed: false }, { status: 201 });
}
