-- Prisma migration 0007_course_library_references
-- Many-to-many between courses and real library_items. A course references
-- zero-or-more LibraryItems; a LibraryItem can be a reference for several
-- courses. Deleting a course removes only the join rows (LibraryItems
-- survive); deleting a LibraryItem removes only its join rows (courses
-- survive). Purely additive: the legacy course_resources table is untouched.
-- order_index keeps the admin-selected reference order stable across reloads.

CREATE TABLE IF NOT EXISTS course_library_references (
    id              UUID           NOT NULL DEFAULT gen_random_uuid(),
    course_id       UUID           NOT NULL,
    library_item_id UUID           NOT NULL,
    order_index     INTEGER        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT course_library_references_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS course_library_references_course_id_library_item_id_key
    ON course_library_references(course_id, library_item_id);
CREATE INDEX IF NOT EXISTS idx_course_library_references_course_id
    ON course_library_references(course_id);
CREATE INDEX IF NOT EXISTS idx_course_library_references_library_item_id
    ON course_library_references(library_item_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_library_references_course_id_fkey') THEN
        ALTER TABLE course_library_references
            ADD CONSTRAINT course_library_references_course_id_fkey
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_library_references_library_item_id_fkey') THEN
        ALTER TABLE course_library_references
            ADD CONSTRAINT course_library_references_library_item_id_fkey
            FOREIGN KEY (library_item_id) REFERENCES library_items(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- updated_at trigger (join rows are mutable via re-linking / reordering)
DROP TRIGGER IF EXISTS trg_course_library_references_updated ON course_library_references;
CREATE TRIGGER trg_course_library_references_updated
    BEFORE UPDATE ON course_library_references
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();