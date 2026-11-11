import { NextRequest } from "next/server";

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

// In-memory rate limiting store for login attempts
const attempts = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export function getClientIp(req: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === "true";
  if (trustProxy) {
    const xForwardedFor = req.headers.get("x-forwarded-for");
    if (xForwardedFor) {
      const firstIp = xForwardedFor.split(",")[0].trim();
      if (firstIp) return firstIp;
    }
    const xRealIp = req.headers.get("x-real-ip");
    if (xRealIp) return xRealIp.trim();
  }

  // Fallback to connection remote address or localhost
  return "127.0.0.1";
}

export function checkLoginRateLimit(req: NextRequest, username: string): {
  isLimited: boolean;
  retryAfterSec?: number;
} {
  const ip = getClientIp(req);
  const key = `${ip}:${username.trim().toLowerCase()}`;
  const now = Date.now();

  const record = attempts.get(key);
  if (!record) {
    return { isLimited: false };
  }

  // Check if locked
  if (record.lockedUntil > now) {
    const retryAfterSec = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
    return { isLimited: true, retryAfterSec };
  }

  // Check if window expired
  if (now - record.firstAttemptAt > WINDOW_MS) {
    attempts.delete(key);
    return { isLimited: false };
  }

  return { isLimited: false };
}

export function recordFailedLogin(req: NextRequest, username: string): {
  isLocked: boolean;
  retryAfterSec?: number;
  remainingAttempts: number;
} {
  const ip = getClientIp(req);
  const key = `${ip}:${username.trim().toLowerCase()}`;
  const now = Date.now();

  let record = attempts.get(key);
  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    record = { count: 1, firstAttemptAt: now, lockedUntil: 0 };
    attempts.set(key, record);
    return { isLocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - 1 };
  }

  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    const retryAfterSec = Math.ceil(LOCKOUT_MS / 1000);
    return { isLocked: true, retryAfterSec, remainingAttempts: 0 };
  }

  return { isLocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - record.count };
}

export function clearLoginRateLimit(req: NextRequest, username: string): void {
  const ip = getClientIp(req);
  const key = `${ip}:${username.trim().toLowerCase()}`;
  attempts.delete(key);
}
