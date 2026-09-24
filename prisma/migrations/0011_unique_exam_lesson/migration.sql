-- Prisma migration 0011_unique_exam_lesson
-- One exam per lesson: a lesson can be linked to at most one exam.
-- NULL lesson_id values are unaffected (PostgreSQL allows multiple NULLs
-- in a unique index), so course-level exams without a linked lesson still work.

CREATE UNIQUE INDEX IF NOT EXISTS "exams_lesson_id_key" ON "exams"("lesson_id");
