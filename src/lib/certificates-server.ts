import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

// Shared server-side certificate logic. Identity always comes from the caller
// (session); nothing here trusts client-supplied user/course ownership.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCertificateCode(): string {
  const year = new Date().getUTCFullYear();
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return `SIRAJ-${year}-${suffix}`;
}

export interface Eligibility {
  eligible: boolean;
  lessonsComplete: boolean;
  examPassed: boolean;
  totalLessons: number;
  doneLessons: number;
}

// A student earns a course certificate only when BOTH hold, computed live
// from the database (never from client state):
//  1. all course lessons completed, 2. a passed attempt on a course exam
//     (scorePercentage >= that exam's own passingScorePercentage).
export async function checkEligibility(studentId: string, courseId: string): Promise<Eligibility> {
  const totalLessons = await prisma.lesson.count({ where: { courseId } });
  const doneLessons =
    totalLessons === 0
      ? 0
      : await prisma.lessonCompletion.count({ where: { studentId, lesson: { courseId } } });
  const lessonsComplete = totalLessons > 0 && doneLessons >= totalLessons;

  let examPassed = false;
  if (lessonsComplete) {
    const attempts = await prisma.examAttempt.findMany({
      where: { studentId, status: "completed", exam: { courseId } },
      include: { exam: { select: { passingScorePercentage: true } } },
    });
    examPassed = attempts.some(
      (attempt) => Number(attempt.scorePercentage) >= attempt.exam.passingScorePercentage
    );
  }

  return {
    eligible: lessonsComplete && examPassed,
    lessonsComplete,
    examPassed,
    totalLessons,
    doneLessons,
  };
}

export async function findOwnCertificate(studentId: string, courseId: string) {
  return prisma.certificate.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
}
