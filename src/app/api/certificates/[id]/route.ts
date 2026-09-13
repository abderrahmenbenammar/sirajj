import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The caller's own certificate with trusted display data (course, student
// name, qualifying score). Foreign certificates resolve to 404 (no oracle).
export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, titleAr: true, titleEn: true } },
      student: { select: { fullName: true } },
    },
  });
  if (!certificate || certificate.studentId !== studentId) {
    return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { studentId, status: "completed", exam: { courseId: certificate.courseId } },
    include: { exam: { select: { passingScorePercentage: true } } },
    orderBy: { scorePercentage: "desc" },
  });
  const best = attempts.find((attempt) => Number(attempt.scorePercentage) >= attempt.exam.passingScorePercentage) ?? null;

  return NextResponse.json({
    id: certificate.id,
    certificateCode: certificate.certificateCode,
    issueDate: certificate.issueDate,
    pdfUrl: certificate.pdfUrl,
    course: certificate.course,
    studentName: certificate.student.fullName,
    bestScorePercentage: best ? Number(best.scorePercentage) : null,
  });
}
