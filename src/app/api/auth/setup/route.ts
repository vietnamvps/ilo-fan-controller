import { NextRequest, NextResponse } from "next/server";
import { hasAdminUser, createAdminUser, saveIloConfig, getIloConfig } from "../../../../lib/storage";
import { authenticateUser, COOKIE_NAME } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const hasAdmin = await hasAdminUser();
    if (hasAdmin) {
      return NextResponse.json(
        { error: "Hệ thống đã có tài khoản quản trị. Vui lòng đăng nhập bình thường." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { username, password, confirmPassword, iloHost, iloPort, iloUsername, iloPassword, minFanSpeed } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "Tên tài khoản quản trị phải từ 3 ký tự trở lên." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu quản trị phải từ 6 ký tự trở lên." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Mật khẩu xác nhận không khớp." }, { status: 400 });
    }

    // Create admin user in SQLite
    const result = await createAdminUser(username.trim(), password);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Không thể tạo tài khoản admin." }, { status: 500 });
    }

    // Save initial iLO configuration if provided
    const currentIlo = await getIloConfig();
    await saveIloConfig({
      ...currentIlo,
      host: typeof iloHost === "string" ? iloHost.trim() : currentIlo.host,
      sshPort: Number(iloPort) || 22,
      username: typeof iloUsername === "string" && iloUsername.trim() ? iloUsername.trim() : "Administrator",
      password: typeof iloPassword === "string" ? iloPassword : "",
      minFanSpeed: Number(minFanSpeed) || 15,
      mockMode: !iloHost || iloHost.trim() === "",
    });

    // Automatically sign in the new admin
    const token = await authenticateUser(username.trim(), password);

    const response = NextResponse.json({
      success: true,
      message: "Khởi tạo hệ thống và tài khoản quản trị thành công!",
    });

    if (token) {
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
    }

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi thiết lập hệ thống: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
