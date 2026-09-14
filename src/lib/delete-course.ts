import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

/**
 * Deletion helpers for exam / course.
 *
 * The ONLY `ON DELETE RESTRICT` foreign keys in the schema are on
 * exam_attempt_answers:
 *   question_id        -> exam_questions       ON DELETE RESTRICT
 *   selected_option_id -> exam_question_options ON DELETE RESTRICT
 * Every other FK in the chain is CASCADE (course -> exam -> question ->
 * option -> attempt -> answer, plus lessons/resources/progress/certificates).
 *
 * A plain `exam.delete()` / `course.delete()` therefore fails with Prisma
 * P2003 as soon as a student attempt answer exists: PostgreSQL evaluates the
 * RESTRICT guard the moment an exam_question / exam_question_option row is
 * deleted, and the schema itself cannot cascade the answer rows off it because
 * the answer rows are referenced by RESTRICT, not removed beforehand.
 *
 * Deterministic fix (no migration, no schema change, no db push):
 *  1) delete exam_attempt_answers first  — removes the RESTRICT pointers;
 *  2) delete exam_attempts explicitly    — removes the attempt rows so the
 *     remaining deletion never has to schedule their cascade;
 *  3) delete the exam / course            — the existing CASCADE completes
 *     lessons, questions, options, resources, progress, certificates.
 * All three steps run inside ONE transaction per operation (see the routes).
 *
 * Answer lookup is done by BOTH attempt-belonging-to-exam and
 * question-belonging-to-exam so that even an anomalous answer row that slips
 * past the DB validation trigger can never resurrect a RESTRICT failure.
 */

async function answerIdsForExam(db: Db, examId: string): Promise<string[]> {
  const attempts = await db.examAttempt.findMany({
    where: { examId },
    select: { id: true },
  });
  const byAttempt =
    attempts.length > 0
      ? await db.examAttemptAnswer.findMany({
          where: { attemptId: { in: attempts.map((attempt) => attempt.id) } },
          select: { id: true },
        })
      : [];
  const byQuestion = await db.examAttemptAnswer.findMany({
    where: { question: { examId } },
    select: { id: true },
  });
  return [...new Set([...byAttempt, ...byQuestion].map((answer) => answer.id))];
}

export async function deleteExamWithDependencies(db: Db, examId: string): Promise<void> {
  const answerIds = await answerIdsForExam(db, examId);
  if (answerIds.length > 0) {
    await db.examAttemptAnswer.deleteMany({ where: { id: { in: answerIds } } });
  }
  await db.examAttempt.deleteMany({ where: { examId } });
  await db.exam.delete({ where: { id: examId } });
}

async function answerIdsForCourse(db: Db, courseId: string): Promise<string[]> {
  const exams = await db.exam.findMany({
    where: { courseId },
    select: { id: true },
  });
  const attemptIds = exams.length
    ? (
        await db.examAttempt.findMany({
          where: { examId: { in: exams.map((exam) => exam.id) } },
          select: { id: true },
        })
      ).map((attempt) => attempt.id)
    : [];
  const byAttempt =
    attemptIds.length > 0
      ? await db.examAttemptAnswer.findMany({
          where: { attemptId: { in: attemptIds } },
          select: { id: true },
        })
      : [];
  const byQuestion = await db.examAttemptAnswer.findMany({
    where: { question: { exam: { courseId } } },
    select: { id: true },
  });
  return [...new Set([...byAttempt, ...byQuestion].map((answer) => answer.id))];
}

export async function deleteCourseWithDependencies(db: Db, courseId: string): Promise<void> {
  const answerIds = await answerIdsForCourse(db, courseId);
  if (answerIds.length > 0) {
    await db.examAttemptAnswer.deleteMany({ where: { id: { in: answerIds } } });
  }
  const exams = await db.exam.findMany({
    where: { courseId },
    select: { id: true },
  });
  if (exams.length > 0) {
    await db.examAttempt.deleteMany({ where: { examId: { in: exams.map((exam) => exam.id) } } });
  }
  await db.course.delete({ where: { id: courseId } });
}