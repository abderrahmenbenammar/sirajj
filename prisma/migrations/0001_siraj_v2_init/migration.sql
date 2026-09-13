-- Prisma migration 0001_siraj_v2_init (CONSOLIDATED)
-- SIRAJ v2 full structure on an EMPTY PostgreSQL database (Supabase).
-- `prisma migrate deploy` alone produces the complete v2 database.
-- Companion schema: prisma/schema.prisma (index/constraint names pinned via `map`).
-- Contents in order: extensions -> tables (+PK/FK/UNIQUE/NOT NULL/DEFAULTs,
-- plain btree indexes) -> CHECKs -> generated tsvector columns ->
-- GIN/pg_trgm/partial indexes -> comments -> updated_at triggers ->
-- exam-answer validation trigger.
-- Mirror reference: prisma/sql/siraj_complement.sql (readable copy of the
-- custom-SQL section at the end of THIS file; canonical source is this migration).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================= 1. users =================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email CITEXT NOT NULL CONSTRAINT users_email_key UNIQUE,
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  theme_preference TEXT NOT NULL DEFAULT 'light',
  profile_visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 2. instructors =================
CREATE TABLE instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  short_bio_ar TEXT,
  short_bio_en TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 3. categories =================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL CONSTRAINT categories_slug_key UNIQUE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 4. courses =================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  short_description_ar TEXT,
  short_description_en TEXT,
  curriculum_ar TEXT,
  curriculum_en TEXT,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 5. lessons =================
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  video_url TEXT NOT NULL,
  subtitle_url TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT lessons_course_id_order_index_key UNIQUE (course_id, order_index)
);

-- ================= 6. course_resources =================
CREATE TABLE course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  file_url TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 7. library_items =================
CREATE TABLE library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  author_name TEXT,
  description_ar TEXT,
  description_en TEXT,
  content_url TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  published_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 8. exams =================
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  passing_score_percentage INTEGER NOT NULL DEFAULT 60,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 9. exam_questions =================
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text_ar TEXT NOT NULL,
  question_text_en TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT exam_questions_exam_id_order_index_key UNIQUE (exam_id, order_index)
);

-- ================= 10. exam_question_options =================
CREATE TABLE exam_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  option_text_ar TEXT NOT NULL,
  option_text_en TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 11. exam_attempts =================
CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT exam_attempts_exam_id_student_id_attempt_number_key UNIQUE (exam_id, student_id, attempt_number)
);

-- ================= 12. exam_attempt_answers =================
CREATE TABLE exam_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE RESTRICT,
  selected_option_id UUID NOT NULL REFERENCES exam_question_options(id) ON DELETE RESTRICT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT exam_attempt_answers_attempt_id_question_id_key UNIQUE (attempt_id, question_id)
);

-- ================= 13. certificates =================
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_code TEXT NOT NULL CONSTRAINT certificates_certificate_code_key UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT certificates_student_id_course_id_key UNIQUE (student_id, course_id)
);

-- ================= 14. student_course_progress =================
CREATE TABLE student_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT student_course_progress_student_id_course_id_key UNIQUE (student_id, course_id)
);

-- ================= 15. lesson_completions =================
CREATE TABLE lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT lesson_completions_student_id_lesson_id_key UNIQUE (student_id, lesson_id)
);

-- ================= 16. contact_messages =================
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 17. faqs =================
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_ar TEXT NOT NULL,
  question_en TEXT NOT NULL,
  answer_ar TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 18. user_sessions =================
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address INET,
  refresh_token_hash TEXT NOT NULL CONSTRAINT user_sessions_refresh_token_hash_key UNIQUE,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  last_active_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 19. password_reset_tokens =================
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL CONSTRAINT password_reset_tokens_token_key UNIQUE,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ================= 20. newsletter_subscribers =================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL CONSTRAINT newsletter_subscribers_email_key UNIQUE,
  subscribed_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- =====================================================
-- Plain btree indexes (names pinned to prisma/schema.prisma via `map`)
-- GIN / pg_trgm / partial indexes live in the complement file.
-- =====================================================
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_category_id ON courses(category_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_course_order ON lessons(course_id, order_index);
CREATE INDEX idx_course_resources_course_id ON course_resources(course_id);
CREATE INDEX idx_library_items_category_id ON library_items(category_id);
CREATE INDEX idx_library_items_type ON library_items(type);
CREATE INDEX idx_library_items_published ON library_items(published_at DESC);
CREATE INDEX idx_exams_course_id ON exams(course_id);
CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_options_question_id ON exam_question_options(question_id);
CREATE INDEX idx_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX idx_attempts_student_id ON exam_attempts(student_id);
CREATE INDEX idx_attempts_exam_student ON exam_attempts(exam_id, student_id);
CREATE INDEX idx_attempt_answers_attempt_id ON exam_attempt_answers(attempt_id);
CREATE INDEX idx_attempt_answers_question_id ON exam_attempt_answers(question_id);
CREATE INDEX idx_certificates_student_id ON certificates(student_id);
CREATE INDEX idx_certificates_course_id ON certificates(course_id);
CREATE INDEX idx_progress_student_id ON student_course_progress(student_id);
CREATE INDEX idx_progress_course_id ON student_course_progress(course_id);
CREATE INDEX idx_progress_status ON student_course_progress(status);
CREATE INDEX idx_lesson_completions_student ON lesson_completions(student_id);
CREATE INDEX idx_lesson_completions_lesson ON lesson_completions(lesson_id);
CREATE INDEX idx_contact_status ON contact_messages(status, created_at DESC);
CREATE INDEX idx_faqs_category_order ON faqs(category, order_index);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_last_active ON user_sessions(user_id, last_active_at DESC);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_reset_tokens_user_id ON password_reset_tokens(user_id);

-- =====================================================
-- Custom SQL (identical mirror: prisma/sql/siraj_complement.sql)
-- CHECKs -> tsvector generated columns -> GIN/pg_trgm/partial indexes ->
-- comments -> updated_at triggers -> exam-answer validation.
-- Kept inside this official migration so `migrate deploy` alone builds
-- the full v2 database. Prisma schema intentionally omits these objects;
-- it stays compatible (extra DB columns/constraints/triggers are
-- invisible to the Prisma client and are never dropped by migrations).
-- =====================================================

-- ---------- (0) دالة updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- (أ) قيود CHECK (مطابقة DDL v2) ----------
ALTER TABLE users ADD CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE users ADD CONSTRAINT chk_users_auth_provider CHECK (auth_provider IN ('email', 'google', 'apple'));
ALTER TABLE users ADD CONSTRAINT chk_users_preferred_language CHECK (preferred_language IN ('ar', 'en'));
ALTER TABLE users ADD CONSTRAINT chk_users_theme CHECK (theme_preference IN ('light', 'dark'));
ALTER TABLE users ADD CONSTRAINT chk_users_visibility CHECK (profile_visibility IN ('public', 'private'));
ALTER TABLE users ADD CONSTRAINT chk_users_password_nonempty CHECK (password_hash IS NULL OR password_hash <> '');

ALTER TABLE categories ADD CONSTRAINT chk_categories_slug_format CHECK (slug ~ '^[a-z0-9-]+$');

ALTER TABLE lessons ADD CONSTRAINT chk_lessons_order_nonneg CHECK (order_index >= 0);

ALTER TABLE course_resources ADD CONSTRAINT chk_course_resources_type CHECK (resource_type IN ('pdf', 'link', 'document'));

ALTER TABLE library_items ADD CONSTRAINT chk_library_items_type CHECK (type IN ('book', 'article', 'research', 'lecture'));

ALTER TABLE exams ADD CONSTRAINT chk_exams_passing_range CHECK (passing_score_percentage BETWEEN 0 AND 100);
ALTER TABLE exams ADD CONSTRAINT chk_exams_max_attempts CHECK (max_attempts >= 1);

ALTER TABLE exam_questions ADD CONSTRAINT chk_exam_questions_order_nonneg CHECK (order_index >= 0);

ALTER TABLE exam_attempts ADD CONSTRAINT chk_attempts_number CHECK (attempt_number >= 1);
ALTER TABLE exam_attempts ADD CONSTRAINT chk_attempts_score_nonneg CHECK (score >= 0);
ALTER TABLE exam_attempts ADD CONSTRAINT chk_attempts_percentage_range CHECK (score_percentage BETWEEN 0 AND 100);
ALTER TABLE exam_attempts ADD CONSTRAINT chk_attempts_status CHECK (status IN ('in_progress', 'completed'));
ALTER TABLE exam_attempts ADD CONSTRAINT chk_attempts_submitted_after_start CHECK (submitted_at IS NULL OR submitted_at >= started_at);

ALTER TABLE student_course_progress ADD CONSTRAINT chk_progress_percentage_range CHECK (completion_percentage BETWEEN 0 AND 100);
ALTER TABLE student_course_progress ADD CONSTRAINT chk_progress_status CHECK (status IN ('in_progress', 'completed'));
ALTER TABLE student_course_progress ADD CONSTRAINT chk_progress_completed_after_start CHECK (completed_at IS NULL OR completed_at >= started_at);

ALTER TABLE contact_messages ADD CONSTRAINT chk_contact_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE contact_messages ADD CONSTRAINT chk_contact_status CHECK (status IN ('new', 'read', 'replied'));

ALTER TABLE faqs ADD CONSTRAINT chk_faqs_order_nonneg CHECK (order_index >= 0);

ALTER TABLE user_sessions ADD CONSTRAINT chk_sessions_expiry_after_creation CHECK (expires_at > created_at);

ALTER TABLE password_reset_tokens ADD CONSTRAINT chk_reset_expiry_after_creation CHECK (expires_at > created_at);

ALTER TABLE newsletter_subscribers ADD CONSTRAINT chk_newsletter_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ---------- (ب) أعمدة tsvector المولّدة (بحث عربي/إنجليزي منفصل) ----------
ALTER TABLE courses
  ADD COLUMN search_vector_ar TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('arabic', coalesce(title_ar,'') || ' ' || coalesce(short_description_ar,'') || ' ' || coalesce(curriculum_ar,''))
  ) STORED;
ALTER TABLE courses
  ADD COLUMN search_vector_en TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title_en,'') || ' ' || coalesce(short_description_en,'') || ' ' || coalesce(curriculum_en,''))
  ) STORED;

ALTER TABLE library_items
  ADD COLUMN search_vector_ar TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('arabic', coalesce(title_ar,'') || ' ' || coalesce(description_ar,'') || ' ' || coalesce(author_name,''))
  ) STORED;
ALTER TABLE library_items
  ADD COLUMN search_vector_en TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title_en,'') || ' ' || coalesce(description_en,'') || ' ' || coalesce(author_name,''))
  ) STORED;

-- ---------- (ج) فهارس GIN و pg_trgm ----------
CREATE INDEX idx_courses_search_ar ON courses USING GIN (search_vector_ar);
CREATE INDEX idx_courses_search_en ON courses USING GIN (search_vector_en);
CREATE INDEX idx_courses_title_ar_trgm ON courses USING GIN (title_ar gin_trgm_ops);
CREATE INDEX idx_courses_title_en_trgm ON courses USING GIN (title_en gin_trgm_ops);

CREATE INDEX idx_library_search_ar ON library_items USING GIN (search_vector_ar);
CREATE INDEX idx_library_search_en ON library_items USING GIN (search_vector_en);
CREATE INDEX idx_library_title_ar_trgm ON library_items USING GIN (title_ar gin_trgm_ops);
CREATE INDEX idx_library_title_en_trgm ON library_items USING GIN (title_en gin_trgm_ops);

-- ---------- (د) الفهارس الجزئية ----------
-- إجابة صحيحة واحدة فقط لكل سؤال
CREATE UNIQUE INDEX uq_one_correct_option_per_question
  ON exam_question_options(question_id) WHERE is_correct = TRUE;
-- فهرس الإجابات الخاطئة (مصدر "نقاط الضعف")
CREATE INDEX idx_attempt_answers_wrong
  ON exam_attempt_answers(attempt_id) WHERE is_correct = FALSE;
-- الرموز النشطة فقط (غير المستهلكة)
CREATE INDEX idx_reset_tokens_active
  ON password_reset_tokens(user_id) WHERE used = FALSE;

COMMENT ON COLUMN password_reset_tokens.token IS 'SHA-256 hash of the reset token only. Never store or log the raw token.';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'SHA-256 hash of the opaque refresh token only. Rotate on each refresh.';

-- ---------- (هـ/1) triggers updated_at (20 جدولًا) ----------
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_instructors_updated ON instructors;
CREATE TRIGGER trg_instructors_updated BEFORE UPDATE ON instructors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_courses_updated ON courses;
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lessons_updated ON lessons;
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_course_resources_updated ON course_resources;
CREATE TRIGGER trg_course_resources_updated BEFORE UPDATE ON course_resources FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_library_items_updated ON library_items;
CREATE TRIGGER trg_library_items_updated BEFORE UPDATE ON library_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_exams_updated ON exams;
CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_exam_questions_updated ON exam_questions;
CREATE TRIGGER trg_exam_questions_updated BEFORE UPDATE ON exam_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_exam_options_updated ON exam_question_options;
CREATE TRIGGER trg_exam_options_updated BEFORE UPDATE ON exam_question_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_exam_attempts_updated ON exam_attempts;
CREATE TRIGGER trg_exam_attempts_updated BEFORE UPDATE ON exam_attempts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_attempt_answers_updated ON exam_attempt_answers;
CREATE TRIGGER trg_attempt_answers_updated BEFORE UPDATE ON exam_attempt_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_certificates_updated ON certificates;
CREATE TRIGGER trg_certificates_updated BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_progress_updated ON student_course_progress;
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON student_course_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lesson_completions_updated ON lesson_completions;
CREATE TRIGGER trg_lesson_completions_updated BEFORE UPDATE ON lesson_completions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_contact_updated ON contact_messages;
CREATE TRIGGER trg_contact_updated BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_faqs_updated ON faqs;
CREATE TRIGGER trg_faqs_updated BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_sessions_updated ON user_sessions;
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_reset_tokens_updated ON password_reset_tokens;
CREATE TRIGGER trg_reset_tokens_updated BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_newsletter_updated ON newsletter_subscribers;
CREATE TRIGGER trg_newsletter_updated BEFORE UPDATE ON newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- (هـ/2) التحقق من سلامة exam_attempt_answers ----------
-- يمنع حالتين لا تغطيهما المفاتيح الأجنبية وحدها:
--  1) ربط selected_option_id بخيار تابع لسؤال مختلف.
--  2) ربط الإجابة بسؤال خارج اختبار المحاولة نفسها.
-- (يبقى فحص مماثل على مستوى التطبيق كطبقة ثانية — دفاع بالعمق.)
CREATE OR REPLACE FUNCTION validate_exam_attempt_answer()
RETURNS TRIGGER AS $$
DECLARE
  v_option_question_id UUID;
  v_question_exam_id   UUID;
  v_attempt_exam_id    UUID;
BEGIN
  SELECT question_id INTO v_option_question_id
  FROM exam_question_options WHERE id = NEW.selected_option_id;

  IF v_option_question_id IS NULL THEN
    RAISE EXCEPTION 'selected_option_id does not exist: %', NEW.selected_option_id;
  END IF;

  IF v_option_question_id <> NEW.question_id THEN
    RAISE EXCEPTION 'selected option % does not belong to question %', NEW.selected_option_id, NEW.question_id;
  END IF;

  SELECT exam_id INTO v_question_exam_id
  FROM exam_questions WHERE id = NEW.question_id;

  SELECT exam_id INTO v_attempt_exam_id
  FROM exam_attempts WHERE id = NEW.attempt_id;

  IF v_question_exam_id IS NULL OR v_attempt_exam_id IS NULL THEN
    RAISE EXCEPTION 'question or attempt does not exist';
  END IF;

  IF v_question_exam_id <> v_attempt_exam_id THEN
    RAISE EXCEPTION 'question % does not belong to the attempt exam', NEW.question_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_attempt_answer ON exam_attempt_answers;
CREATE TRIGGER trg_validate_attempt_answer
BEFORE INSERT OR UPDATE ON exam_attempt_answers
FOR EACH ROW EXECUTE FUNCTION validate_exam_attempt_answer();
