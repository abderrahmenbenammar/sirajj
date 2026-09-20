import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFinalScore } from "@/lib/certificates/score";
import { gradeFor, formatScore, formatDurationDetailed } from "@/lib/certificates/layout";
import { getCourseDuration } from "@/lib/certificates/videos";

type Context = { params: Promise<{ code: string }> };

// Public verification by certificate code. Reveals only what is printed on
// the certificate itself: code, student name, course, issue date, final
// score, grade and duration. No ids, tokens, or internals.
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

  // Same single computation as the page and the image: stored snapshots
  // first, live grade/duration across all course exams as fallback.
  const stored = certificate.finalScorePercentage === null ? null : Number(certificate.finalScorePercentage);
  const needLive = stored === null || certificate.durationSeconds === null || certificate.durationSeconds === undefined;
  const [final, duration] = await Promise.all([
    stored === null ? computeFinalScore(certificate.studentId, certificate.courseId) : null,
    needLive && (certificate.durationSeconds === null || certificate.durationSeconds === undefined)
      ? getCourseDuration(certificate.courseId)
      : null,
  ]);
  const score = stored ?? final?.percentage ?? 0;
  const totalSeconds = certificate.durationSeconds ?? duration?.totalSeconds ?? null;
  return NextResponse.json({
    valid: true,
    certificateCode: certificate.certificateCode,
    studentName: certificate.student.fullName,
    courseTitleAr: certificate.course.titleAr,
    courseTitleEn: certificate.course.titleEn,
    issueDate: certificate.issueDate,
    scoreText: formatScore(score),
    gradeText: gradeFor(score),
    durationText: formatDurationDetailed(totalSeconds),
  });
}
