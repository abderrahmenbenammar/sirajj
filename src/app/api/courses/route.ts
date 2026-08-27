import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const levelNames = { BEGINNER: ["مبتدئ", "Beginner"], INTERMEDIATE: ["متوسط", "Intermediate"], ADVANCED: ["متقدم", "Advanced"] } as const;

export async function GET() {
  const courses = await prisma.course.findMany({ include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(courses.map((course) => ({
    id: course.slug,
    title: course.title,
    titleEn: course.title,
    instructor: "",
    instructorEn: "",
    description: course.description ?? "",
    descriptionEn: course.description ?? "",
    image: course.image ?? "/courses/aqeedah.jpg",
    level: levelNames[course.level][0],
    levelEn: levelNames[course.level][1],
    duration: `${course.lessons.length} درس`,
    lessons: course.lessons.length,
    category: "العقيدة",
    categoryEn: "Creed",
    curriculum: course.lessons.map((lesson) => ({ id: `c${lesson.position}`, title: lesson.title, titleEn: lesson.title, duration: "فيديو", type: "video", videoUrl: lesson.videoUrl })),
    objectives: [],
    objectivesEn: [],
    references: [],
  })));
}
