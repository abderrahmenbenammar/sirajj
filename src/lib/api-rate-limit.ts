import { prisma } from "@/lib/prisma";

const HOUR_IN_MS = 60 * 60 * 1000;

type RateLimitOptions = {
  userId: string;
  route: string;
  limit: number;
  now?: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/** Atomically consumes one request from a per-user fixed-hour window. */
export async function consumeApiRateLimit({
  userId,
  route,
  limit,
  now = Date.now(),
}: RateLimitOptions): Promise<RateLimitResult> {
  const windowStartMs = Math.floor(now / HOUR_IN_MS) * HOUR_IN_MS;
  const windowStart = new Date(windowStartMs);
  const [row] = await prisma.$queryRaw<Array<{ requestCount: number }>>`
    INSERT INTO api_rate_limits (user_id, route, window_start, request_count, updated_at)
    VALUES (${userId}::uuid, ${route}, ${windowStart}, 1, NOW())
    ON CONFLICT (user_id, route)
    DO UPDATE SET
      request_count = CASE
        WHEN api_rate_limits.window_start = EXCLUDED.window_start
          THEN api_rate_limits.request_count + 1
        ELSE 1
      END,
      window_start = EXCLUDED.window_start,
      updated_at = NOW()
    RETURNING request_count AS "requestCount"
  `;

  return {
    allowed: row.requestCount <= limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowStartMs + HOUR_IN_MS - now) / 1000),
    ),
  };
}
