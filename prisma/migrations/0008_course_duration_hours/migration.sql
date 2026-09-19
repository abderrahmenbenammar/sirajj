-- Prisma migration 0008_course_duration_hours
-- Optional course length in whole hours for certificates (مدة الدورة).
-- Purely additive nullable column: existing courses are untouched and keep
-- the lesson-count fallback label.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_hours INTEGER;
