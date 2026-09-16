-- Prisma migration 0005_exam_points_and_lesson
-- F5: per-question points + optional exam-level video (lesson).
-- exam_questions.points defaults to 1 so legacy questions keep the previous
-- "one point per correct answer" behavior automatically.
-- exams.lesson_id is nullable (ON DELETE SET NULL) so deleting a lesson never
-- deletes an exam that references it as its optional preview video.

ALTER TABLE exam_questions ADD COLUMN points INTEGER NOT NULL DEFAULT 1;

ALTER TABLE exams ADD COLUMN lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
CREATE INDEX idx_exams_lesson_id ON exams(lesson_id);
