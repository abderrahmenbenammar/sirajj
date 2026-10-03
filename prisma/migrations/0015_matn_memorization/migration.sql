-- Prisma migration 0015_matn_memorization
-- Memorized religious texts (mutoon) + recitation quizzes for the
-- الحفظ والتسميع (Memorization & Recitation) module.

CREATE TABLE IF NOT EXISTS mutoon (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matn_quizzes (
  id TEXT PRIMARY KEY,
  matn_id TEXT NOT NULL REFERENCES mutoon(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matn_quizzes_matn_id ON matn_quizzes(matn_id);
