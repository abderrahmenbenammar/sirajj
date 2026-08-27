import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isCourseContent = /^\/courses\/[^/]+(?:\/lessons\/[^/]+)?$/.test(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const isAuthenticated = Boolean(request.auth?.user);
  const isAdminUser = request.auth?.user?.role === "ADMIN";

  if ((isCourseContent && !isAuthenticated) || (isAdmin && !isAdminUser)) {
    return NextResponse.redirect(new URL(isAdmin ? "/auth/login?admin=1" : "/auth/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/courses/:path*", "/admin/:path*"],
};
