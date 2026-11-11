import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, updateAdminPassword } from "./storage";

const COOKIE_NAME = "ilo_fan_auth";

/**
 * Kiểm tra cấu hình cờ secure cho cookie dựa trên biến môi trường và request protocol:
 * COOKIE_SECURE=true | false | auto (mặc định auto: true khi request là HTTPS hoặc x-forwarded-proto=https)
 */
export function isSecureCookie(req?: NextRequest): boolean {
  const envVal = (process.env.COOKIE_SECURE || "auto").trim().toLowerCase();
  if (envVal === "true" || envVal === "1") return true;
  if (envVal === "false" || envVal === "0") return false;

  // Chế độ auto
  if (!req) return false;
  const proto = req.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  return req.nextUrl?.protocol === "https:";
}

export async function authenticateUser(username: string, password: string): Promise<string | null> {
  const auth = getAuthConfig();
  if (!auth) {
    return null;
  }

  if (username !== auth.username) {
    return null;
  }

  const isValid = bcrypt.compareSync(password, auth.passwordHash);
  if (!isValid) {
    return null;
  }

  // Create JWT token with 7 days expiration
  const secret = new TextEncoder().encode(auth.jwtSecret);
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifySessionToken(token: string): Promise<{ valid: boolean; username?: string }> {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false };
    }
    const auth = getAuthConfig();
    if (!auth) return { valid: false };

    const secret = new TextEncoder().encode(auth.jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (payload.username !== auth.username) {
      return { valid: false };
    }

    return { valid: true, username: payload.username as string };
  } catch {
    return { valid: false };
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const result = await verifySessionToken(token);
  return result.valid;
}

/**
 * Helper bảo vệ API route handler:
 * Gọi ở đầu mỗi API route yêu cầu quyền admin.
 * Trả về NextResponse 401 nếu chưa xác thực, hoặc null nếu hợp lệ.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
      },
      { status: 401 }
    );
  }
  return null;
}

export function updatePassword(newPassword: string, newUsername?: string): boolean {
  return updateAdminPassword(newPassword, newUsername);
}

export { COOKIE_NAME };
