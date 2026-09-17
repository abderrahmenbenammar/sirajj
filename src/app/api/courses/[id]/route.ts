import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { COURSE_PATH_LABELS } from "@/lib/course-paths";
import { loadCourseGate } from "@/lib/lesson-gate";

type Context = { params: Promise<{ id: string }> };

// Course.id is a UUID in the v2 schema: anything else can never match,
// so reject it early with 404 instead of letting Prisma throw P2023.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: { select: { nameAr: true, nameEn: true } },
      lessons: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!course) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  // Viewer progress (0 when logged out or not started) — read-only enrichment.
  let progress = 0;
  const session = await auth();
  const studentId = session?.user?.id;
  if (studentId) {
    const entry = await prisma.studentCourseProgress.findUnique({
      where: { studentId_courseId: { studentId, courseId: course.id } },
      select: { completionPercentage: true },
    });
    if (entry) progress = Number(entry.completionPercentage);
  }
  // Per-lesson completion flags for the viewer (empty when logged out).
  let completedLessonIds: string[] = [];
  if (studentId) {
    const rows = await prisma.lessonCompletion.findMany({
      where: { studentId, lesson: { courseId: course.id } },
      select: { lessonId: true },
    });
    completedLessonIds = rows.map((row) => row.lessonId);
  }
  // Server-resolved exam gate: locked lessons are flagged and their video URL
  // is withheld here (the gated lesson endpoint is the only content source).
  const gate = await loadCourseGate(studentId ?? null, course.id);
  return NextResponse.json({
    id: course.id,
    title: course.titleAr,
    titleEn: course.titleEn,
    instructor: course.instructorNameAr ?? course.instructor?.nameAr ?? "",
    instructorEn: course.instructorNameEn ?? course.instructor?.nameEn ?? "",
    description: course.shortDescriptionAr ?? "",
    descriptionEn: course.shortDescriptionEn ?? "",
    image: course.coverImageUrl ?? "",
    path: course.path,
    pathAr: COURSE_PATH_LABELS[course.path].ar,
    pathEn: COURSE_PATH_LABELS[course.path].en,
    duration: `${course.lessons.length} درس`,
    lessons: course.lessons.length,
    curriculum: course.lessons.map((lesson) => {
      const locked = gate.lockedLessonIds.has(lesson.id);
      return {
        id: lesson.id,
        title: lesson.titleAr,
        titleEn: lesson.titleEn,
        duration: "فيديو",
        type: "video",
        videoUrl: locked ? "" : lesson.videoUrl,
        locked,
        hasExam: gate.gatedLessonIds.has(lesson.id),
      };
    }),
    examLessonIds: [...gate.gatedLessonIds],
    objectives: [],
    objectivesEn: [],
    references: [],
    progress,
    completedLessonIds,
  });
}