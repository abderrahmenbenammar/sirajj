import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
      category: { select: { nameAr: true, nameEn: true } },
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
  return NextResponse.json({
    id: course.id,
    title: course.titleAr,
    titleEn: course.titleEn,
    instructor: course.instructor?.nameAr ?? "",
    instructorEn: course.instructor?.nameEn ?? "",
    description: course.shortDescriptionAr ?? "",
    descriptionEn: course.shortDescriptionEn ?? "",
    image: course.coverImageUrl ?? "/courses/aqeedah.jpg",
    // v2 schema has no level field; kept as empty for UI compatibility.
    level: "",
    levelEn: "",
    duration: `${course.lessons.length} درس`,
    lessons: course.lessons.length,
    category: course.category?.nameAr ?? "العقيدة",
    categoryEn: course.category?.nameEn ?? "Creed",
    curriculum: course.lessons.map((lesson) => ({ id: lesson.id, title: lesson.titleAr, titleEn: lesson.titleEn, duration: "فيديو", type: "video", videoUrl: lesson.videoUrl })),
    objectives: [],
    objectivesEn: [],
    references: [],
    progress,
    completedLessonIds,
  });
}
