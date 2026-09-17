import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Authenticated student's learning overview, built only from v2 schema models:
// StudentCourseProgress + LessonCompletion + Certificate. Read-only.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, createdAt: true } });
  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const progress = await prisma.studentCourseProgress.findMany({
    where: { studentId: userId },
    include: {
      course: {
        select: {
          id: true,
          titleAr: true,
          titleEn: true,
          coverImageUrl: true,
          instructorNameAr: true,
          instructorNameEn: true,
          instructor: { select: { nameAr: true, nameEn: true } },
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const completions = await prisma.lessonCompletion.findMany({
    where: { studentId: userId },
    select: { lesson: { select: { courseId: true } } },
  });
  const doneByCourse: Record<string, number> = {};
  for (const entry of completions) {
    doneByCourse[entry.lesson.courseId] = (doneByCourse[entry.lesson.courseId] ?? 0) + 1;
  }

  const certificates = await prisma.certificate.findMany({
    where: { studentId: userId },
    include: { course: { select: { titleAr: true, titleEn: true } } },
    orderBy: { issueDate: "desc" },
  });

  const courses = progress.map((entry) => ({
    id: entry.course.id,
    titleAr: entry.course.titleAr,
    titleEn: entry.course.titleEn,
    coverImageUrl: entry.course.coverImageUrl,
    instructorAr: entry.course.instructorNameAr ?? entry.course.instructor?.nameAr ?? "",
    instructorEn: entry.course.instructorNameEn ?? entry.course.instructor?.nameEn ?? "",
    completion: Number(entry.completionPercentage),
    status: entry.status,
    totalLessons: entry.course._count.lessons,
    doneLessons: doneByCourse[entry.course.id] ?? 0,
  }));

  const lessonsDone = Object.values(doneByCourse).reduce((sum, count) => sum + count, 0);

  return NextResponse.json({
    user,
    courses,
    certificates: certificates.map((cert) => ({
      id: cert.id,
      certificateCode: cert.certificateCode,
      issueDate: cert.issueDate,
      pdfUrl: cert.pdfUrl,
      courseTitleAr: cert.course.titleAr,
      courseTitleEn: cert.course.titleEn,
    })),
    stats: {
      active: progress.filter((entry) => entry.status !== "completed").length,
      completed: progress.filter((entry) => entry.status === "completed").length,
      lessonsDone,
      certificates: certificates.length,
    },
  });
}
