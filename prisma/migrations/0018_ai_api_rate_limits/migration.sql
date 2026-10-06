CREATE TABLE "api_rate_limits" (
  "user_id" UUID NOT NULL,
  "route" VARCHAR(64) NOT NULL,
  "window_start" TIMESTAMPTZ(6) NOT NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_rate_limits_pkey" PRIMARY KEY ("user_id", "route"),
  CONSTRAINT "api_rate_limits_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
