-- =====================================================
-- SIRAJ v2 — complement SQL: FROZEN REFERENCE MIRROR (Supabase / PostgreSQL)
-- Canonical source: prisma/migrations/0001_siraj_v2_init/migration.sql
-- (the custom-SQL section there is identical to the body below).
-- DO NOT run this file after `prisma migrate deploy` — it would fail on
-- duplicates. Kept only as a readable reference/source for review and
-- for authoring future custom-SQL migrations.
-- Contents (squashed into migration 0001 so `migrate deploy` alone
-- yields the full v2 schema):
--  (أ) قيود CHECK  (ب) أعمدة tsvector المولّدة
--  (ج) فهارس GIN و pg_trgm  (د) الفهارس الجزئية
--  (هـ) triggers updated_at + trigger التحقق من إجابات المحاولات
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
