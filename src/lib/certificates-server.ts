import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCourseVideoDurations } from "@/lib/certificates/videos";
import { computeFinalScore } from "@/lib/certificates/score";
import { diagnoseCourseDuration, getCourseDuration } from "@/lib/certificates/videos";

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

// Idempotent auto-issuance shared by the manual endpoint and the automatic
// hooks (lesson completion, exam submit). Returns the existing certificate
// when one was already issued, creates one when eligibility holds, and
// returns null when the student is not eligible yet. The UNIQUE
// (student, course) constraint is the final backstop against races.
export async function ensureCertificate(studentId: string, courseId: string) {
  const existing = await findOwnCertificate(studentId, courseId);
  if (existing) {
    return { certificate: existing, existed: true };
  }
  const eligibility = await checkEligibility(studentId, courseId);
  if (!eligibility.eligible) {
    return null;
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      // Snapshots at issue time: final grade across all course exams AND the
      // current course video total. Later exam/lesson edits never rewrite an
      // issued certificate. A snapshot failure stores NULL and readers fall
      // back to the live computation — issuance never blocks.
      let finalScore: number | null = null;
      let durationSecs: number | null = null;
      try {
        finalScore = (await computeFinalScore(studentId, courseId)).percentage;
        // **Resolve course video durations using the new engine: this fetches
        // missing YouTube durations from the Data API, caches them, and updates
        // lesson rows so the snapshot captures the real total at issue time.**
        const durationInfo = await resolveCourseVideoDurations(courseId, false);
        durationSecs = durationInfo.totalSeconds;
      } catch (error) {
        console.error("[certificates/snapshot] duration resolve failed at issue", studentId, courseId, error);
        // Keep durationSecs null so the certificate is created with NULL,
        // and readers fall back to live computation later.
      }
      // A null duration is never silent: log exactly which lessons lack a
      // usable length and why, so "غير محددة" is always traceable.
      if (durationSecs === null) {
        try {
          const diagnosis = await diagnoseCourseDuration(courseId);
          console.warn(
            "[certificates/snapshot] duration unknown at issue",
            studentId,
            courseId,
            diagnosis.lessons.map((l) => `${l.titleAr.slice(0, 24)}:${l.reason}`).join(" | ")
          );
        } catch (diagError) {
          console.warn("[certificates/snapshot] could not generate duration diagnosis", diagError);
        }
      }
      const certificate = await prisma.certificate.create({
        data: {
          studentId,
          courseId,
          certificateCode: makeCertificateCode(),
          finalScorePercentage: finalScore,
          durationSeconds: durationSecs,
        },
      });
      return { certificate, existed: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await findOwnCertificate(studentId, courseId);
        if (raced) return { certificate: raced, existed: true };
        continue; // code collision → retry with a fresh code
      }
      throw error;
    }
  }
  throw new Error("certificate-issue-failed");
}
