import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StudentStatsGrid from "@/components/dashboard/StudentStatsGrid";
import DashboardSection from "@/components/dashboard/DashboardSection";
import CourseProgressCard from "@/components/dashboard/CourseProgressCard";
import CertificateCard from "@/components/dashboard/CertificateCard";
import {
  CertificatesEmptyState,
  CoursesEmptyState,
} from "@/components/dashboard/DashboardEmptyStates";
import DashboardQuickLinks from "@/components/dashboard/DashboardQuickLinks";
import type {
  DashboardCertificate,
  DashboardCourse,
  DashboardStats,
} from "@/components/dashboard/types";

// Authenticated, per-user data (session + Prisma) — must render at request
// time, never at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) redirect("/auth/login");
  if (session?.user?.role === "ADMIN") redirect("/admin");

  // Enrollments = StudentCourseProgress rows. Lesson completions are counted
  // per course to compute progress = (completedLessons / totalLessons) * 100.
  const [enrollments, completions, certificates] = await Promise.all([
    prisma.studentCourseProgress.findMany({
      where: { studentId: userId },
      include: {
        course: {
          select: {
            id: true,
            titleAr: true,
            titleEn: true,
            instructorNameAr: true,
            instructorNameEn: true,
            instructor: { select: { nameAr: true, nameEn: true } },
            _count: { select: { lessons: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.lessonCompletion.findMany({
      where: { studentId: userId },
      select: { lesson: { select: { courseId: true } } },
    }),
    prisma.certificate.findMany({
      where: { studentId: userId },
      include: { course: { select: { titleAr: true, titleEn: true } } },
      orderBy: { issueDate: "desc" },
    }),
  ]);

  const doneByCourse: Record<string, number> = {};
  for (const completion of completions) {
    const courseId = completion.lesson.courseId;
    doneByCourse[courseId] = (doneByCourse[courseId] ?? 0) + 1;
  }

  const courses: DashboardCourse[] = enrollments.map((enrollment) => {
    const totalLessons = enrollment.course._count.lessons;
    const completedLessons = Math.min(doneByCourse[enrollment.course.id] ?? 0, totalLessons);
    const progress =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: enrollment.course.id,
      titleAr: enrollment.course.titleAr,
      titleEn: enrollment.course.titleEn,
      instructorAr:
        enrollment.course.instructorNameAr ?? enrollment.course.instructor?.nameAr ?? "",
      instructorEn:
        enrollment.course.instructorNameEn ?? enrollment.course.instructor?.nameEn ?? "",
      totalLessons,
      completedLessons,
      progress,
      isCompleted:
        enrollment.status === "completed" ||
        (totalLessons > 0 && completedLessons >= totalLessons),
    };
  });

  const userCertificates: DashboardCertificate[] = certificates.map((certificate) => ({
    id: certificate.id,
    certificateCode: certificate.certificateCode,
    issueDate: certificate.issueDate.toISOString(),
    courseTitleAr: certificate.course.titleAr,
    courseTitleEn: certificate.course.titleEn,
  }));

  const stats: DashboardStats = {
    totalEnrolled: courses.length,
    totalCompletedCourses: courses.filter((course) => course.isCompleted).length,
    certificatesCount: userCertificates.length,
  };

  const firstName = session.user.name?.split(" ")[0];

  return (
    <div className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
        <DashboardHeader firstName={firstName} />

        <StudentStatsGrid stats={stats} />

        <DashboardSection
          title={{ ar: "تقدمك في الدورات", en: "Your Course Progress" }}
          action={{ label: { ar: "تصفح الدورات", en: "Browse Courses" }, href: "/courses" }}
        >
          {courses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <CourseProgressCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <CoursesEmptyState />
          )}
        </DashboardSection>

        <DashboardSection
          title={{ ar: "شهاداتي", en: "My Certificates" }}
          action={
            userCertificates.length > 0
              ? { label: { ar: "عرض الكل", en: "View All" }, href: "/dashboard/certificates" }
              : undefined
          }
        >
          {userCertificates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {userCertificates.map((certificate) => (
                <CertificateCard key={certificate.id} certificate={certificate} />
              ))}
            </div>
          ) : (
            <CertificatesEmptyState />
          )}
        </DashboardSection>

        {/* Quick links retained for continuity with the previous dashboard. */}
        <DashboardQuickLinks />
      </div>
    </div>
  );
}
