-- Prisma migration 0004_course_paths
-- Replace course "categories" (topical) with fixed learning paths.
-- Paths are a PostgreSQL ENUM (BEGINNER / INTERMEDIATE / ADVANCED); every
-- course gets a NOT NULL path, backfilled with 'BEGINNER' via column DEFAULT
-- (no course can exist without a path afterwards).
-- Course.category_id is decoupled from courses: the Category table stays and
-- keeps serving LIBRARY items only. No data is deleted; existing categories
-- (and any linked library rows) are left untouched.

CREATE TYPE "CoursePath" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

ALTER TABLE courses ADD COLUMN path "CoursePath" NOT NULL DEFAULT 'BEGINNER';

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_category_id_fkey;
DROP INDEX IF EXISTS idx_courses_category_id;
ALTER TABLE courses DROP COLUMN IF EXISTS category_id;