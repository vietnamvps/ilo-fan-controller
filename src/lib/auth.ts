import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getAuthConfig, saveAuthConfig } from "./storage";

const COOKIE_NAME = "ilo_fan_auth";

export async function authenticateUser(username: string, password: string): Promise<string | null> {
  const auth = getAuthConfig();
  
  if (username !== auth.username) {
    return null;
  }

  const isValid = bcrypt.compareSync(password, auth.passwordHash);
  if (!isValid) {
    return null;
  }

  // Create JWT token
  const secret = new TextEncoder().encode(auth.jwtSecret);
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const auth = getAuthConfig();
    const secret = new TextEncoder().encode(auth.jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload.username === auth.username;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return await verifySessionToken(token);
}

export function updatePassword(newPassword: string, newUsername?: string): boolean {
  try {
    const auth = getAuthConfig();
    const salt = bcrypt.genSaltSync(10);
    auth.passwordHash = bcrypt.hashSync(newPassword, salt);
    if (newUsername) {
      auth.username = newUsername.trim();
    }
    saveAuthConfig(auth);
    return true;
  } catch (err) {
    console.error("Failed to update password:", err);
    return false;
  }
}

export { COOKIE_NAME };
