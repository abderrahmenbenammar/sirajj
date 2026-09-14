import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

/**
 * Deletes a course together with everything the schema already cascades.
 *
 * The only thing that blocks a plain `course.delete()` is the FK pair:
 *   exam_attempt_answers.question_id        -> exam_questions       ON DELETE RESTRICT
 *   exam_attempt_answers.selected_option_id -> exam_question_options ON DELETE RESTRICT
 * Those RESTRICT guards are evaluated as soon as an exam_question row is
 * deleted, which fails the whole CASCADE chain whenever a student exam attempt
 * answer exists — even though the schema also CASCADEs the answers via
 * exam_attempt_answers.attempt_id -> exam_attempts.
 *
 * Fix (no migration, no schema change): delete the answer rows first — the
 * exact rows the schema already designed to cascade off — then let the course
 * CASCADE complete the rest (lessons, resources, exams, questions, options,
 * attempts, completions, progress, certificates).
 */
export async function deleteCourseWithDependencies(db: Db, courseId: string): Promise<void> {
  const attempts = await db.examAttempt.findMany({
    where: { exam: { courseId } },
    select: { id: true },
  });

  if (attempts.length > 0) {
    await db.examAttemptAnswer.deleteMany({
      where: { attemptId: { in: attempts.map((attempt) => attempt.id) } },
    });
  }

  await db.course.delete({ where: { id: courseId } });
}