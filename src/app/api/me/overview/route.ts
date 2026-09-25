import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Authenticated student's learning overview, built only from v2 schema models:
// StudentCourseProgress + LessonCompletion + Certificate. Read-only.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Independent reads run in one wave (single round-trip on pooled
  // connections) instead of four sequential awaits.
  const [user, progress, completions, certificates] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, createdAt: true } }),
    prisma.studentCourseProgress.findMany({
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
    }),
    // One bulk read for timestamps (same query family as the counts below).
    prisma.lessonCompletion.findMany({
      where: { studentId: userId },
      select: {
        lessonId: true,
        completedAt: true,
        lesson: { select: { courseId: true } },
      },
    }),
    prisma.certificate.findMany({
      where: { studentId: userId },
      include: { course: { select: { titleAr: true, titleEn: true } } },
      orderBy: { issueDate: "desc" },
    }),
  ]);
  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const doneByCourse: Record<string, number> = {};
  const completedAtByLesson: Record<string, string> = {};
  for (const entry of completions) {
    doneByCourse[entry.lesson.courseId] = (doneByCourse[entry.lesson.courseId] ?? 0) + 1;
    completedAtByLesson[entry.lessonId] = entry.completedAt.toISOString();
  }

  const courseIds = progress.map((entry) => entry.course.id);

  // Bulk reads only (no per-course queries): all lessons of the student's
  // courses for last/next-lesson resolution, plus recent submitted attempts
  // for the activity feed.
  const [allLessons, recentAttempts] = await Promise.all([
    courseIds.length > 0
      ? prisma.lesson.findMany({
          where: { courseId: { in: courseIds } },
          select: { id: true, courseId: true, titleAr: true, titleEn: true, orderIndex: true },
          orderBy: [{ courseId: "asc" }, { orderIndex: "asc" }],
        })
      : Promise.resolve([]),
    prisma.examAttempt.findMany({
      where: { studentId: userId, status: "completed", submittedAt: { not: null } },
      select: {
        id: true,
        submittedAt: true,
        exam: {
          select: {
            id: true,
            titleAr: true,
            titleEn: true,
            courseId: true,
            course: { select: { titleAr: true, titleEn: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  const lessonsByCourse = new Map<string, typeof allLessons>();
  for (const lesson of allLessons) {
    const list = lessonsByCourse.get(lesson.courseId) ?? [];
    list.push(lesson);
    lessonsByCourse.set(lesson.courseId, list);
  }

  type LessonRef = { id: string; titleAr: string; titleEn: string; orderIndex: number };
  type CompletedRef = LessonRef & { completedAt: string };
  const courses = progress.map((entry) => {
    const lessons = lessonsByCourse.get(entry.course.id) ?? [];
    let lastCompleted: CompletedRef | null = null;
    let next: LessonRef | null = null;
    let lastActivityAt: string | null = null;
    for (const lesson of lessons) {
      const completedAt = completedAtByLesson[lesson.id];
      if (completedAt) {
        if (!lastActivityAt || completedAt > lastActivityAt) lastActivityAt = completedAt;
        if (!lastCompleted || completedAt > lastCompleted.completedAt) {
          lastCompleted = {
            id: lesson.id,
            titleAr: lesson.titleAr,
            titleEn: lesson.titleEn,
            orderIndex: lesson.orderIndex,
            completedAt,
          };
        }
      } else if (!next) {
        next = { id: lesson.id, titleAr: lesson.titleAr, titleEn: lesson.titleEn, orderIndex: lesson.orderIndex };
      }
    }
    return {
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
      lastCompletedLesson: lastCompleted,
      nextLesson: next,
      lastActivityAt,
    };
  });

  const lessonsDone = Object.values(doneByCourse).reduce((sum, count) => sum + count, 0);

  // Recent activity merged from real tables only (no activity log exists):
  // latest completions, submitted attempts, and issued certificates.
  const lessonById = new Map(allLessons.map((lesson) => [lesson.id, lesson]));
  const courseTitleById = new Map(progress.map((entry) => [entry.course.id, { titleAr: entry.course.titleAr, titleEn: entry.course.titleEn }]));
  type ActivityItem =
    | { kind: "lesson"; date: string; courseId: string; lessonTitleAr: string; lessonTitleEn: string; courseTitleAr: string; courseTitleEn: string }
    | { kind: "exam"; date: string; examId: string; examTitleAr: string; examTitleEn: string; courseTitleAr: string; courseTitleEn: string }
    | { kind: "certificate"; date: string; certificateId: string; courseTitleAr: string; courseTitleEn: string };
  const activity: ActivityItem[] = [];
  for (const entry of completions) {
    const lesson = lessonById.get(entry.lessonId);
    if (!lesson) continue;
    const courseTitle = courseTitleById.get(lesson.courseId);
    activity.push({
      kind: "lesson",
      date: entry.completedAt.toISOString(),
      courseId: lesson.courseId,
      lessonTitleAr: lesson.titleAr,
      lessonTitleEn: lesson.titleEn,
      courseTitleAr: courseTitle?.titleAr ?? "",
      courseTitleEn: courseTitle?.titleEn ?? "",
    });
  }
  for (const attempt of recentAttempts) {
    if (!attempt.submittedAt) continue;
    activity.push({
      kind: "exam",
      date: attempt.submittedAt.toISOString(),
      examId: attempt.exam.id,
      examTitleAr: attempt.exam.titleAr,
      examTitleEn: attempt.exam.titleEn,
      courseTitleAr: attempt.exam.course.titleAr,
      courseTitleEn: attempt.exam.course.titleEn,
    });
  }
  for (const cert of certificates.slice(0, 5)) {
    activity.push({
      kind: "certificate",
      date: new Date(cert.issueDate).toISOString(),
      certificateId: cert.id,
      courseTitleAr: cert.course.titleAr,
      courseTitleEn: cert.course.titleEn,
    });
  }
  activity.sort((a, b) => (a.date < b.date ? 1 : -1));

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
    activity: activity.slice(0, 6),
    stats: {
      active: progress.filter((entry) => entry.status !== "completed").length,
      completed: progress.filter((entry) => entry.status === "completed").length,
      lessonsDone,
      certificates: certificates.length,
    },
  });
}
