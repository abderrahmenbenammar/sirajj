-- Prisma migration 0013_notification_sound_enabled
-- Per-user toggle for the custom in-app notification sound. Existing users
-- keep the current behaviour (enabled by default).

ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_sound_enabled BOOLEAN NOT NULL DEFAULT true;
