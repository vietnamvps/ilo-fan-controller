import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/storage";
import { updatePassword } from "@/lib/auth";

export async function GET() {
  const auth = getAuthConfig();
  return NextResponse.json({
    username: auth.username,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword, newUsername } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" }, { status: 400 });
    }

    const auth = getAuthConfig();
    const bcrypt = await import("bcryptjs");
    if (!bcrypt.compareSync(currentPassword, auth.passwordHash)) {
      return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 401 });
    }

    const success = updatePassword(newPassword, newUsername);
    if (!success) {
      return NextResponse.json({ error: "Không thể cập nhật mật khẩu" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Đã cập nhật mật khẩu thành công" });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Lỗi hệ thống: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
