import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderCertificateById } from "@/lib/certificates/render";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Render the caller's own certificate as a PNG on the immutable template.
// Certificates are immutable historical records, so the image is
// deterministic per id and cached aggressively. Foreign certificates resolve
// to 404 (no oracle), admins may preview any certificate.
export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    select: { id: true, studentId: true },
  });
  if (!certificate) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });
  if (certificate.studentId !== userId && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });
  }

  const png = await renderCertificateById(id);
  if (!png) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });

  return new Response(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
