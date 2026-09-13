import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Admin certificate registry: read-only listing (certificates are immutable
// historical records — no update/delete endpoints by design).
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const q = asText(searchParams.get("q"));

  const certificates = await prisma.certificate.findMany({
    where: q
      ? {
          OR: [
            { certificateCode: { contains: q.toUpperCase(), mode: "insensitive" } },
            { student: { fullName: { contains: q, mode: "insensitive" } } },
            { course: { titleAr: { contains: q, mode: "insensitive" } } },
            { course: { titleEn: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      course: { select: { id: true, titleAr: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  return NextResponse.json(
    certificates.map((cert) => ({
      id: cert.id,
      certificateCode: cert.certificateCode,
      issueDate: cert.issueDate,
      student: cert.student,
      course: cert.course,
    }))
  );
}
