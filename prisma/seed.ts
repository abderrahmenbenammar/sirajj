import { PrismaClient, CourseLevel } from "@prisma/client";
import { courses } from "../src/lib/mock-data";

const prisma = new PrismaClient();

const levelMap: Record<string, CourseLevel> = {
  مبتدئ: CourseLevel.BEGINNER,
  متوسط: CourseLevel.INTERMEDIATE,
  متقدم: CourseLevel.ADVANCED,
};

async function main() {
  for (const course of courses) {
    const savedCourse = await prisma.course.upsert({
      where: { slug: course.id },
      update: {
        title: course.title,
        description: course.description,
        level: levelMap[course.level],
      },
      create: {
        slug: course.id,
        title: course.title,
        description: course.description,
        level: levelMap[course.level],
      },
    });

    await prisma.lesson.deleteMany({ where: { courseId: savedCourse.id } });
    await prisma.lesson.createMany({
      data: course.curriculum.map((lesson, index) => ({
        courseId: savedCourse.id,
        title: lesson.title,
        position: index + 1,
        videoUrl: lesson.videoUrl ?? null,
      })),
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
