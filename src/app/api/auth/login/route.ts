import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, isSecureCookie, COOKIE_NAME } from "../../../../lib/auth";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
} from "../../../../lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Vui lòng nhập tên người dùng và mật khẩu" }, { status: 400 });
    }

    const cleanUsername = username.trim();

    // 1. Kiểm tra rate limit
    const rateCheck = checkLoginRateLimit(req, cleanUsername);
    if (rateCheck.isLimited) {
      return NextResponse.json(
        {
          error: "TooManyRequests",
          message: `Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ${rateCheck.retryAfterSec} giây.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSec || 900),
          },
        }
      );
    }

    // 2. Xác thực credentials
    const token = await authenticateUser(cleanUsername, password);

    if (!token) {
      const failStatus = recordFailedLogin(req, cleanUsername);
      if (failStatus.isLocked) {
        return NextResponse.json(
          {
            error: "TooManyRequests",
            message: `Tài khoản đã bị tạm khóa do nhập sai quá 5 lần. Thử lại sau ${failStatus.retryAfterSec} giây.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(failStatus.retryAfterSec || 900),
            },
          }
        );
      }

      return NextResponse.json(
        {
          error: "Unauthorized",
          message: `Tên đăng nhập hoặc mật khẩu không chính xác. Còn lại ${failStatus.remainingAttempts} lần thử.`,
        },
        { status: 401 }
      );
    }

    // 3. Đăng nhập thành công -> Xóa bộ đếm rate limit
    clearLoginRateLimit(req, cleanUsername);

    const response = NextResponse.json({ success: true, message: "Đăng nhập thành công" });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecureCookie(req),
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi hệ thống: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
