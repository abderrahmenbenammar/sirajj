import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderCertificateById } from "@/lib/certificates/render";
import { certificatePngToPdf } from "@/lib/certificates/pdf";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Downloads the exact certificate artwork as a lossless, landscape A4 PDF.
export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    select: { id: true, studentId: true, certificateCode: true },
  });
  if (!certificate) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });
  if (certificate.studentId !== userId && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });
  }

  try {
    const png = await renderCertificateById(id);
    if (!png) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });

    const pdf = await certificatePngToPdf(png);
    const safeCode = certificate.certificateCode.replace(/[^A-Za-z0-9_-]/g, "");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `attachment; filename="siraj-certificate-${safeCode}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[certificates/pdf] rendering failed", error);
    return NextResponse.json({ error: "تعذر إنشاء ملف الشهادة" }, { status: 500 });
  }
}
