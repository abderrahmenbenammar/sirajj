-- Duolingo-style question types for matn recitation quizzes.
-- Idempotent (IF NOT EXISTS) because migrations are applied manually via `prisma db execute`.

ALTER TABLE "matn_quizzes" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'write';
ALTER TABLE "matn_quizzes" ADD COLUMN IF NOT EXISTS "options" JSONB;
