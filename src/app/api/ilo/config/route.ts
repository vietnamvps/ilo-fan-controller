import { NextRequest, NextResponse } from "next/server";
import { getIloConfig, saveIloConfig } from "../../../../lib/storage";
import { requireAuth } from "../../../../lib/auth";
import { isValidHost, isValidPort, verifyCsrf } from "../../../../lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  const config = getIloConfig();
  // Tuyệt đối không trả về chuỗi mật khẩu iLO ra frontend
  return NextResponse.json({
    host: config.host,
    sshPort: config.sshPort,
    httpPort: config.httpPort,
    username: config.username,
    hasPassword: Boolean(config.password && config.password.length > 0),
    minFanSpeed: config.minFanSpeed,
    maxFanSpeed: config.maxFanSpeed,
    mockMode: config.mockMode,
    autoRefreshInterval: config.autoRefreshInterval || 5,
  });
}

export async function POST(req: NextRequest) {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid Origin / CSRF Rejected" }, { status: 403 });
  }

  try {
    const current = getIloConfig();
    const body = await req.json();

    if (body.host !== undefined && body.host !== "") {
      if (!isValidHost(body.host)) {
        return NextResponse.json(
          { error: "Địa chỉ IP hoặc Hostname iLO không hợp lệ." },
          { status: 400 }
        );
      }
    }

    if (body.sshPort !== undefined) {
      if (!isValidPort(body.sshPort)) {
        return NextResponse.json(
          { error: "Cổng SSH không hợp lệ (1 - 65535)." },
          { status: 400 }
        );
      }
    }

    if (body.httpPort !== undefined) {
      if (!isValidPort(body.httpPort)) {
        return NextResponse.json(
          { error: "Cổng HTTP/HTTPS không hợp lệ (1 - 65535)." },
          { status: 400 }
        );
      }
    }

    const updated = {
      ...current,
      host: typeof body.host === "string" ? body.host.trim() : current.host,
      sshPort: Number(body.sshPort) || 22,
      httpPort: Number(body.httpPort) || 443,
      username: typeof body.username === "string" ? body.username.trim() : current.username,
      password: typeof body.password === "string" && body.password.length > 0 ? body.password : current.password,
      minFanSpeed: Math.max(10, Math.min(100, Number(body.minFanSpeed) || 15)),
      maxFanSpeed: Math.max(50, Math.min(100, Number(body.maxFanSpeed) || 100)),
      mockMode: Boolean(body.mockMode),
      autoRefreshInterval: Math.max(2, Math.min(60, Number(body.autoRefreshInterval) || 5)),
    };

    saveIloConfig(updated);
    return NextResponse.json({ success: true, message: "Đã lưu cấu hình iLO thành công!" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi lưu cấu hình: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
