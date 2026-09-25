import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Public contact form. Guests allowed (no user FK in schema).
// Any userId sent by the client is ignored — nothing here is attributed.
export async function POST(request: Request) {
  const body = await request.json();
  const name = asText(body.name);
  const email = asText(body.email);
  const subject = asText(body.subject);
  const message = asText(body.message);

  if (!name || !subject || !message) {
    return NextResponse.json({ error: "الاسم والموضوع والرسالة حقول مطلوبة" }, { status: 400 });
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
  }
  // Stored verbatim and shown in the admin panel: cap lengths so one
  // request cannot stuff unbounded text into the database.
  if (name.length > 100 || subject.length > 200 || message.length > 5000) {
    return NextResponse.json({ error: "النص أطول من الحد المسموح" }, { status: 400 });
  }

  await prisma.contactMessage.create({
    data: { name, email: email.toLowerCase(), subject, message },
  });
  return NextResponse.json({ success: true }, { status: 201 });
}
