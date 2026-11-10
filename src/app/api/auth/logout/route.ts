import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Đã đăng xuất" });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
