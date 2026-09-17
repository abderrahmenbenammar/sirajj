-- Prisma migration 0006_course_instructor_names
-- Course instructor becomes free text owned by the course, like its title.
-- The admin types any name directly; no Instructor row is required.
-- Purely additive: the instructors table and courses.instructor_id relation
-- are left intact for backward compatibility and legacy data. Existing courses
-- keep instructor_id = NULL/old value and simply have NULL text names, so the
-- public mapping falls back to the legacy relation name until an admin edits it.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name_ar TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name_en TEXT;
