-- Prisma migration 0003_user_role_status
-- F4: add role + status to users. New users default to STUDENT / ACTIVE via
-- column defaults (matching the Prisma schema). Existing rows all receive the
-- defaults automatically (NOT NULL columns with DEFAULT backfill safely).
-- CHECKs mirror the allowed values enforced at the application layer.
-- Promoting current ADMIN_EMAILS accounts to ADMIN is intentionally NOT done
-- here (a migration cannot read deployment env safely); it runs as a separate
-- operator bootstrap step right after deploy. No data is deleted.

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'STUDENT';
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('STUDENT', 'ADMIN'));
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'DISABLED'));
