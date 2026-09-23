import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { resolveCourseVideoDurations, diagnoseCourseDuration } from "@/lib/certificates/videos";
import { formatDurationDetailed } from "@/lib/certificates/layout";

type Context = { params: Promise<{ courseId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Re-resolve every lesson video length in the course and return the fresh
// total. By default only lessons WITHOUT a stored duration touch the
// network (cached YouTube rows are reused); ?force=1 re-fetches every
// YouTube duration from the Data API. Non-YouTube lessons keep whatever
// length was captured from their file (the server cannot probe media).
export async function POST(request: Request, { params }: Context) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await resolveCourseVideoDurations(courseId, force);
  return NextResponse.json({
    totalSeconds: result.totalSeconds,
    formatted: formatDurationDetailed(result.totalSeconds),
    knownCount: result.knownCount,
    lessonCount: result.lessonCount,
    lessons: result.lessons,
  });
}
