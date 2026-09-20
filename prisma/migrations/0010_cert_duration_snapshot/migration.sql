-- Prisma migration 0010_cert_duration_snapshot
-- Issued certificates freeze the course video total at issue time, so later
-- lesson/video edits never rewrite history. NULL covers legacy rows (live
-- fallback) and genuinely unknown totals ("غير محددة").

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
