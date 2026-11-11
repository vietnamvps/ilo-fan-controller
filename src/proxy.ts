import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "./lib/auth";
import { hasAdminUser } from "./lib/storage";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static assets and internal framework paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/status")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : { valid: false };
  const isAuth = session.valid;

  // 2. Setup path handling: only allowed if system has NO admin
  const isSetupPath = pathname === "/setup" || pathname.startsWith("/api/auth/setup");
  if (isSetupPath) {
    const adminExists = hasAdminUser();
    if (adminExists) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Hệ thống đã có tài khoản quản trị. Vui lòng đăng nhập." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 3. Login page: redirect authenticated user to dashboard
  if (pathname === "/login") {
    if (isAuth) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 4. Logout endpoint
  if (pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  // 5. Protected routes (All other pages and API endpoints)
  if (!isAuth) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: "Unauthorized", message: "Yêu cầu đăng nhập để truy cập" },
        { status: 401 }
      );
      if (token) {
        response.cookies.delete(COOKIE_NAME);
      }
      return response;
    }

    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) {
      response.cookies.delete(COOKIE_NAME);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
