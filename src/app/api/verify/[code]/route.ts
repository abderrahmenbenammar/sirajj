import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ code: string }> };

// Public verification by certificate code. Reveals only what proves validity:
// code, student name, course, issue date. No ids, tokens, or internals.
export async function GET(_request: Request, { params }: Context) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  if (!/^SIRAJ-\d{4}-[A-Z2-9]{8}$/.test(normalized)) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { certificateCode: normalized },
    include: {
      course: { select: { titleAr: true, titleEn: true } },
      student: { select: { fullName: true } },
    },
  });
  if (!certificate) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    certificateCode: certificate.certificateCode,
    studentName: certificate.student.fullName,
    courseTitleAr: certificate.course.titleAr,
    courseTitleEn: certificate.course.titleEn,
    issueDate: certificate.issueDate,
  });
}
