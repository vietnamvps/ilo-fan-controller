import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/setup") ||
    pathname.startsWith("/api/auth/status") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico");

  const token = request.cookies.get("ilo_fan_auth")?.value;

  // If authenticated and visiting /login or /setup, go to dashboard
  if ((pathname === "/login" || pathname === "/setup") && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If not public and no session token, redirect to /login
  if (!isPublicPath && !token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
