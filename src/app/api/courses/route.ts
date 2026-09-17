import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COURSE_PATH_LABELS } from "@/lib/course-paths";

export async function GET() {
  const courses = await prisma.course.findMany({
    include: {
      instructor: { select: { nameAr: true, nameEn: true } },
      lessons: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(courses.map((course) => ({
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
    curriculum: course.lessons.map((lesson) => ({ id: lesson.id, title: lesson.titleAr, titleEn: lesson.titleEn, duration: "فيديو", type: "video", videoUrl: lesson.videoUrl })),
    objectives: [],
    objectivesEn: [],
    references: [],
  })));
}