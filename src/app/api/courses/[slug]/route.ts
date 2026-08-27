import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ slug: string }> };
const levelNames = { BEGINNER: ["مبتدئ", "Beginner"], INTERMEDIATE: ["متوسط", "Intermediate"], ADVANCED: ["متقدم", "Advanced"] } as const;

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug }, include: { lessons: { orderBy: { position: "asc" } } } });
  if (!course) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  return NextResponse.json({
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
  });
}
