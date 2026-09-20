-- Prisma migration 0009_auto_duration_and_final_score
-- Course duration and certificate grade become computed values:
--  1. Drop the manual courses.duration_hours column (one migration old, never
--     held real data; superseded by summed per-lesson video lengths).
--  2. lessons.video_duration_seconds: measured length per lesson in seconds
--     (NULL = unknown/excluded: no video, pasted non-YouTube URL, unfetchable).
--  3. youtube_video_durations: server-side cache of YouTube Data API results,
--     one row per video ID shared by all lessons embedding it.
--  4. certificates.final_score_percentage: final grade persisted at issue
--     time (NULL on legacy rows → computed live as fallback).

ALTER TABLE courses DROP COLUMN IF EXISTS duration_hours;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;

CREATE TABLE IF NOT EXISTS youtube_video_durations (
    video_id         TEXT           PRIMARY KEY,
    duration_seconds INTEGER,
    fetched_at       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS final_score_percentage DECIMAL(5, 2);
