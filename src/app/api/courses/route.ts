import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const courses = await prisma.course.findMany({
    include: {
      instructor: { select: { nameAr: true, nameEn: true } },
      category: { select: { nameAr: true, nameEn: true } },
      lessons: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(courses.map((course) => ({
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
  })));
}
