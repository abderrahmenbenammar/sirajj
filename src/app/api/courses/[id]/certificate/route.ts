import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkEligibility, findOwnCertificate, makeCertificateCode } from "@/lib/certificates-server";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Issue the caller's certificate for a course. Idempotent: returns the
// existing certificate when eligibility was already certified. The UNIQUE
// (student, course) constraint is the final backstop against races.
export async function POST(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: courseId } = await params;
  if (!UUID_RE.test(courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const existing = await findOwnCertificate(studentId, courseId);
  if (existing) {
    return NextResponse.json({ certificate: existing, existed: true });
  }

  const eligibility = await checkEligibility(studentId, courseId);
  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error: "شروط الشهادة غير مستوفاة",
        lessonsComplete: eligibility.lessonsComplete,
        examPassed: eligibility.examPassed,
      },
      { status: 403 }
    );
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const certificate = await prisma.certificate.create({
        data: { studentId, courseId, certificateCode: makeCertificateCode() },
      });
      return NextResponse.json({ certificate, existed: false }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await findOwnCertificate(studentId, courseId);
        if (raced) return NextResponse.json({ certificate: raced, existed: true });
        continue;
      }
      throw error;
    }
  }
  return NextResponse.json({ error: "تعذر إصدار الشهادة، حاول مجددًا" }, { status: 500 });
}

// Own certificate state for a course (for button states). Never another student's.
export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: courseId } = await params;
  if (!UUID_RE.test(courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const [certificate, eligibility] = await Promise.all([
    findOwnCertificate(studentId, courseId),
    checkEligibility(studentId, courseId),
  ]);
  return NextResponse.json({ certificate, ...eligibility });
}
