-- Prisma migration 0012_course_manual_duration
-- Manual course duration set by the admin (NULL = unspecified). This is the
-- authoritative course length and replaces YouTube-based totals. Existing
-- rows default to NULL (no data is modified).

ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
