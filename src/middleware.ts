import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ["/admin", "/owner", "/tenant"],
  OWNER: ["/owner", "/tenant"],
  TENANT: ["/tenant"],
};

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const session = req.auth;

  // Redirect Google users who haven't chosen a role yet
  if (session?.user?.needsOnboarding && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  // Protected route check
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/tenant");

  if (!isProtected) return NextResponse.next();

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role ?? "";
  const allowed = ROLE_ROUTES[role] ?? [];
  const hasAccess = allowed.some((p) => pathname.startsWith(p));

  if (!hasAccess) {
    if (role === "OWNER") return NextResponse.redirect(new URL("/owner", req.nextUrl.origin));
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Only run middleware on protected routes and onboarding.
  // Do NOT use a catch-all matcher — that runs Prisma in Edge Runtime.
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/tenant/:path*",
    "/onboarding",
  ],
};
