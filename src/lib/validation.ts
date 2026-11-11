import { NextRequest } from "next/server";

/**
 * Kiểm tra hợp lệ index quạt (HP DL380 Gen9 có 6 bay quạt đánh số từ 0 đến 5).
 */
export function isValidFanIndex(index: unknown): index is number {
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index <= 5;
}

/**
 * Kiểm tra tốc độ quạt (phần trăm từ 0 đến 100).
 */
export function isValidFanSpeed(speed: unknown): speed is number {
  return typeof speed === "number" && !Number.isNaN(speed) && speed >= 0 && speed <= 100;
}

/**
 * Kiểm tra hợp lệ Hostname hoặc địa chỉ IPv4 của iLO.
 */
export function isValidHost(host: unknown): host is string {
  if (typeof host !== "string") return false;
  const clean = host.trim();
  if (clean.length === 0 || clean.length > 253) return false;

  // Regex kiểm tra IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = clean.match(ipv4Regex);
  if (ipMatch) {
    const octets = [Number(ipMatch[1]), Number(ipMatch[2]), Number(ipMatch[3]), Number(ipMatch[4])];
    return octets.every((octet) => octet >= 0 && octet <= 255);
  }

  // Regex kiểm tra RFC 1123 Hostname
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(clean);
}

/**
 * Kiểm tra cổng mạng hợp lệ (1 - 65535).
 */
export function isValidPort(port: unknown): port is number {
  const num = typeof port === "number" ? port : Number(port);
  return Number.isInteger(num) && num >= 1 && num <= 65535;
}

/**
 * Kiểm tra tên Preset: độ dài từ 1 - 50 ký tự, không chứa ký tự điều khiển ASCII.
 */
export function isValidPresetName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  const clean = name.trim();
  if (clean.length < 1 || clean.length > 50) return false;
  // Loại trừ ký tự điều khiển \x00-\x1F và \x7F
  return !/[\x00-\x1F\x7F]/.test(clean);
}

/**
 * Kiểm tra CSRF cho các request thay đổi trạng thái (POST, PUT, PATCH, DELETE).
 * - Khi TRUST_PROXY=true: ưu tiên header x-forwarded-host.
 * - Khi TRUST_PROXY=false (mặc định): dùng Host header.
 * - Xử lý Origin:
 *   + Nếu có header Origin: so khớp domain/host với expectedHost.
 *   + Nếu thiếu Origin: fallback kiểm tra Referer host với expectedHost.
 *   + Nếu thiếu cả Origin và Referer: chặn nếu có header Sec-Fetch-Site=cross-site,
 *     cho phép nếu là direct API / cURL tool gọi nội bộ.
 */
export function verifyCsrf(req: NextRequest): boolean {
  const trustProxy = process.env.TRUST_PROXY === "true";
  const expectedHost = (
    trustProxy
      ? (req.headers.get("x-forwarded-host") || req.headers.get("host"))
      : req.headers.get("host")
  )?.trim().toLowerCase();

  if (!expectedHost) return false;

  // Chặn ngay lập tức nếu trình duyệt gắn cờ cross-site
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }

  // Khi thiếu Origin, kiểm tra qua Referer
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }

  // Khi không có cả Origin và Referer (ví dụ: direct cURL hoặc native test script)
  // Chỉ chấp nhận khi không phải cross-site
  return true;
}
