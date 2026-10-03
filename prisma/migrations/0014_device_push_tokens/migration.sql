-- Prisma migration 0014_device_push_tokens
-- FCM registration tokens for native (Capacitor) devices, one row per token.
-- Inactive/invalid tokens are deleted when Firebase Admin reports them dead.

CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(32) NOT NULL DEFAULT 'ANDROID_FCM',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT device_push_tokens_token_key UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS device_push_tokens_user_id ON device_push_tokens(user_id);
