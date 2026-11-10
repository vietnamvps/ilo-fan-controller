import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, COOKIE_NAME } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Vui lòng nhập tên người dùng và mật khẩu" }, { status: 400 });
    }

    const token = await authenticateUser(username.trim(), password);

    if (!token) {
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không chính xác" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, message: "Đăng nhập thành công" });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json({ error: "Lỗi hệ thống: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
