import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalScore } from "@/lib/certificates/score";
import { formatDurationDetailed } from "@/lib/certificates/layout";
import { getCourseDuration } from "@/lib/certificates/videos";

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

  // Final grade across all course exams (Σ approved points ÷ Σ totals).
  // The stored snapshots win; the live computation covers legacy rows.
  const stored = certificate.finalScorePercentage === null ? null : Number(certificate.finalScorePercentage);
  const final = stored ?? (await computeFinalScore(studentId, certificate.courseId)).percentage;
  const liveDuration =
    certificate.durationSeconds === null || certificate.durationSeconds === undefined
      ? (await getCourseDuration(certificate.courseId)).totalSeconds
      : null;
  const totalSeconds = certificate.durationSeconds ?? liveDuration ?? null;

  return NextResponse.json({
    id: certificate.id,
    certificateCode: certificate.certificateCode,
    issueDate: certificate.issueDate,
    pdfUrl: certificate.pdfUrl,
    course: certificate.course,
    studentName: certificate.student.fullName,
    finalScorePercentage: final,
    durationText: formatDurationDetailed(totalSeconds),
  });
}
