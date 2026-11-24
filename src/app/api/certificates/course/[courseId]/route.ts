import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkEligibility, ensureCertificate, findOwnCertificate } from "@/lib/certificates-server";
import { renderCertificatePdf } from "@/lib/certificate";

export const runtime = "nodejs";

type Context = { params: Promise<{ courseId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Official-template PDF for the caller's OWN course certificate. The static
// `course` segment keeps this path distinct from `/api/certificates/[id]` —
// `[id]` and `[courseId]` at the same level would normalize to one dynamic
// route and fail the build (E912).
export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });

  // Eligibility and ownership are computed from the database only — never
  // from client state. An already-issued certificate is downloadable as-is;
  // otherwise the student must currently qualify for one.
  let certificate = await findOwnCertificate(studentId, courseId);
  if (!certificate) {
    const eligibility = await checkEligibility(studentId, courseId);
    if (!eligibility.eligible) return NextResponse.json({ error: "غير مؤهل للشهادة" }, { status: 403 });
    // Idempotent issuance (same rules as the manual endpoint); a concurrent
    // request may have created it between the two queries.
    const issued = await ensureCertificate(studentId, courseId);
    if (!issued) return NextResponse.json({ error: "غير مؤهل للشهادة" }, { status: 403 });
    certificate = issued.certificate;
  }

  const [course, student] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { titleAr: true, titleEn: true } }),
    prisma.user.findUnique({ where: { id: studentId }, select: { fullName: true } }),
  ]);
  if (!course || !student) return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });

  try {
    const pdf = await renderCertificatePdf({
      studentName: student.fullName,
      courseTitle: course.titleAr || course.titleEn,
      completionDate: certificate.issueDate,
      certificateCode: certificate.certificateCode,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `attachment; filename="siraj-certificate-${courseId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[certificates/course] pdf rendering failed", error);
    return NextResponse.json({ error: "تعذر إنشاء ملف الشهادة" }, { status: 500 });
  }
}
