import { prisma } from "@/lib/prisma";
import { COURSE_PATHS } from "@/lib/course-paths";

// Admin learning analytics, computed only from tables the platform already
// writes (users, courses, lessons, progress, exams, attempts, certificates).
// No tracking tables, no external services, no per-row queries: every number
// below comes from counts / groupBys / small bounded reads issued together.
// NOTE: there is deliberately NO "active students" metric — nothing in the
// current data reliably defines activity (no page-view tracking; the session
// table's lastActiveAt is never maintained by the app).

export interface CourseAnalytics {
  id: string;
  titleAr: string;
  enrollments: number;
  completed: number;
  completions: number;
  certificates: number;
  attempts: number;
}

export interface TopLesson {
  id: string;
  titleAr: string;
  courseId: string;
  courseTitleAr: string;
  completions: number;
}

export interface AnalyticsActivityItem {
  kind: "lesson" | "exam" | "certificate";
  date: string;
  href: string;
  studentName: string;
  lessonTitleAr?: string;
  examTitleAr?: string;
  courseTitleAr?: string;
}

export interface RecentCertificate {
  id: string;
  certificateCode: string;
  issueDate: string;
  studentName: string;
  courseTitleAr: string;
}

export interface AdminAnalytics {
  users: { total: number; students: number; admins: number; newThisWeek: number };
  content: { courses: number; lessons: number; libraryItems: number; categories: number; paths: number };
  learning: {
    completions: number;
    completionsThisWeek: number;
    enrollments: number;
    coursesCompleted: number;
    certificates: number;
    certsThisWeek: number;
    attempts: number;
    attemptsThisWeek: number;
    passed: number;
    failed: number;
    avgScore: number | null;
  };
  exams: { total: number };
  courses: CourseAnalytics[];
  topLessons: TopLesson[];
  recentCertificates: RecentCertificate[];
  activity: AnalyticsActivityItem[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const weekAgo = new Date(Date.now() - WEEK_MS);

  const [
    usersByRole,
    usersThisWeek,
    courseCount,
    lessonCount,
    libraryCount,
    categoryCount,
    completionCount,
    completionsThisWeek,
    progressGroups,
    certCount,
    certsThisWeek,
    scoredAttempts,
    attemptsThisWeek,
    examsCount,
    completionsByLesson,
    certsByCourse,
    lessonsInfo,
    coursesInfo,
    recentCompletions,
    recentAttempts,
    recentCerts,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.libraryItem.count(),
    prisma.category.count(),
    prisma.lessonCompletion.count(),
    prisma.lessonCompletion.count({ where: { completedAt: { gte: weekAgo } } }),
    prisma.studentCourseProgress.groupBy({ by: ["courseId", "status"], _count: true }),
    prisma.certificate.count(),
    prisma.certificate.count({ where: { issueDate: { gte: weekAgo } } }),
    // Minimal columns for pass/fail + average (threshold lives per exam,
    // same comparison the issuance logic uses).
    prisma.examAttempt.findMany({
      where: { status: "completed" },
      select: {
        scorePercentage: true,
        submittedAt: true,
        exam: { select: { courseId: true, passingScorePercentage: true } },
      },
    }),
    prisma.examAttempt.count({ where: { status: "completed", submittedAt: { gte: weekAgo } } }),
    prisma.exam.count(),
    prisma.lessonCompletion.groupBy({ by: ["lessonId"], _count: true }),
    prisma.certificate.groupBy({ by: ["courseId"], _count: true }),
    prisma.lesson.findMany({ select: { id: true, titleAr: true, courseId: true, course: { select: { titleAr: true } } } }),
    prisma.course.findMany({ select: { id: true, titleAr: true } }),
    prisma.lessonCompletion.findMany({
      take: 5,
      orderBy: { completedAt: "desc" },
      select: {
        completedAt: true,
        student: { select: { fullName: true } },
        lesson: { select: { id: true, titleAr: true, courseId: true, course: { select: { titleAr: true } } } },
      },
    }),
    prisma.examAttempt.findMany({
      take: 5,
      where: { status: "completed", submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      select: {
        submittedAt: true,
        student: { select: { fullName: true } },
        exam: { select: { id: true, titleAr: true } },
      },
    }),
    prisma.certificate.findMany({
      take: 5,
      orderBy: { issueDate: "desc" },
      select: {
        id: true,
        certificateCode: true,
        issueDate: true,
        student: { select: { fullName: true } },
        course: { select: { titleAr: true } },
      },
    }),
  ]);

  // Users
  let students = 0;
  let admins = 0;
  for (const row of usersByRole) {
    if (row.role === "ADMIN") admins += row._count;
    else students += row._count;
  }

  // Per-course assembly from the grouped counts (no per-course queries).
  const enrollByCourse = new Map<string, number>();
  const completedByCourse = new Map<string, number>();
  for (const row of progressGroups) {
    enrollByCourse.set(row.courseId, (enrollByCourse.get(row.courseId) ?? 0) + row._count);
    if (row.status === "completed") {
      completedByCourse.set(row.courseId, (completedByCourse.get(row.courseId) ?? 0) + row._count);
    }
  }
  const completionsCountByCourse = new Map<string, number>();
  const lessonToCourse = new Map<string, string>();
  for (const lesson of lessonsInfo) lessonToCourse.set(lesson.id, lesson.courseId);
  for (const row of completionsByLesson) {
    const courseId = lessonToCourse.get(row.lessonId);
    if (courseId) completionsCountByCourse.set(courseId, (completionsCountByCourse.get(courseId) ?? 0) + row._count);
  }
  const certsCountByCourse = new Map<string, number>();
  for (const row of certsByCourse) certsCountByCourse.set(row.courseId, row._count);
  const attemptsCountByCourse = new Map<string, number>();
  let passed = 0;
  let scoreSum = 0;
  for (const attempt of scoredAttempts) {
    const score = Number(attempt.scorePercentage);
    scoreSum += score;
    if (score >= attempt.exam.passingScorePercentage) passed += 1;
    attemptsCountByCourse.set(attempt.exam.courseId, (attemptsCountByCourse.get(attempt.exam.courseId) ?? 0) + 1);
  }
  const failed = scoredAttempts.length - passed;

  const courses: CourseAnalytics[] = coursesInfo.map((course) => ({
    id: course.id,
    titleAr: course.titleAr,
    enrollments: enrollByCourse.get(course.id) ?? 0,
    completed: completedByCourse.get(course.id) ?? 0,
    completions: completionsCountByCourse.get(course.id) ?? 0,
    certificates: certsCountByCourse.get(course.id) ?? 0,
    attempts: attemptsCountByCourse.get(course.id) ?? 0,
  }));
  courses.sort((a, b) => b.completions - a.completions);

  // Most completed lessons (from the same grouped counts — no extra reads).
  const lessonTitleById = new Map(lessonsInfo.map((lesson) => [lesson.id, lesson] as const));
  const topLessons: TopLesson[] = [...completionsByLesson]
    .sort((a, b) => b._count - a._count)
    .slice(0, 5)
    .map((row) => {
      const lesson = lessonTitleById.get(row.lessonId);
      return {
        id: row.lessonId,
        titleAr: lesson?.titleAr ?? "",
        courseId: lesson?.courseId ?? "",
        courseTitleAr: lesson?.course.titleAr ?? "",
        completions: row._count,
      };
    })
    .filter((lesson) => lesson.titleAr);

  const recentCertificates: RecentCertificate[] = recentCerts.map((cert) => ({
    id: cert.id,
    certificateCode: cert.certificateCode,
    issueDate: new Date(cert.issueDate).toISOString(),
    studentName: cert.student.fullName,
    courseTitleAr: cert.course.titleAr,
  }));

  // Merged recent activity (real rows only): completions, submissions, issues.
  const activity: AnalyticsActivityItem[] = [
    ...recentCompletions.map((entry) => ({
      kind: "lesson" as const,
      date: entry.completedAt.toISOString(),
      href: `/admin/courses/${entry.lesson.courseId}`,
      studentName: entry.student.fullName,
      lessonTitleAr: entry.lesson.titleAr,
      courseTitleAr: entry.lesson.course.titleAr,
    })),
    ...recentAttempts
      .filter((attempt) => attempt.submittedAt)
      .map((attempt) => ({
        kind: "exam" as const,
        date: (attempt.submittedAt as Date).toISOString(),
        href: "/admin/exams",
        studentName: attempt.student.fullName,
        examTitleAr: attempt.exam.titleAr,
      })),
    ...recentCerts.map((cert) => ({
      kind: "certificate" as const,
      date: new Date(cert.issueDate).toISOString(),
      href: "/admin/certificates",
      studentName: cert.student.fullName,
      courseTitleAr: cert.course.titleAr,
    })),
  ];
  activity.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    users: {
      total: students + admins,
      students,
      admins,
      newThisWeek: usersThisWeek,
    },
    content: {
      courses: courseCount,
      lessons: lessonCount,
      libraryItems: libraryCount,
      categories: categoryCount,
      paths: COURSE_PATHS.length,
    },
    learning: {
      completions: completionCount,
      completionsThisWeek: completionsThisWeek,
      enrollments: progressGroups.reduce((sum, row) => sum + row._count, 0),
      coursesCompleted: progressGroups
        .filter((row) => row.status === "completed")
        .reduce((sum, row) => sum + row._count, 0),
      certificates: certCount,
      certsThisWeek: certsThisWeek,
      attempts: scoredAttempts.length,
      attemptsThisWeek: attemptsThisWeek,
      passed,
      failed,
      avgScore: scoredAttempts.length > 0 ? Math.round((scoreSum / scoredAttempts.length) * 10) / 10 : null,
    },
    exams: { total: examsCount },
    courses,
    topLessons,
    recentCertificates,
    activity: activity.slice(0, 8),
  };
}
