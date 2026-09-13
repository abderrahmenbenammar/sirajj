import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTE: declared as a plain `export async function proxy` (not wrapped via
// auth(...)) so Next.js statically registers it — see middleware-manifest.json.
// Auth state is read with auth() (server-side session) inside the function.
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isCourseContent = /^\/courses\/[^/]+(?:\/lessons\/[^/]+)?$/.test(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);
  const isAdminUser = session?.user?.role === "ADMIN";

  if ((isCourseContent && !isAuthenticated) || (isAdmin && !isAdminUser)) {
    return NextResponse.redirect(new URL(isAdmin ? "/auth/login?admin=1" : "/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/courses/:path*", "/admin/:path*"],
};
