import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// NOTE: declared as a plain `export async function proxy` (not wrapped via
// auth(...)) so Next.js statically registers it — see middleware-manifest.json.
// Auth state is read straight from the signed JWT (same role claim the login
// flow writes) with NO database round-trip: Prisma cannot execute inside the
// edge runtime this function runs on in production, so calling auth() here
// (whose session callback queries the user table) would break session
// resolution for logged-in users and bounce them to login as guests.
// Full session checks (including password-change invalidation) still run on
// every API route and page via auth()/requireAdmin() on the Node runtime.
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isCourseContent = /^\/courses\/[^/]+(?:\/lessons\/[^/]+)?$/.test(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const isAuthenticated = Boolean(token);
  const isAdminUser = (token as { role?: unknown } | null)?.role === "ADMIN";

  if ((isCourseContent && !isAuthenticated) || (isAdmin && !isAdminUser)) {
    return NextResponse.redirect(new URL(isAdmin ? "/auth/login?admin=1" : "/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/courses/:path*", "/admin/:path*"],
};
