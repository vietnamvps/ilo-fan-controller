import { NextRequest, NextResponse } from "next/server";
import { testIloConnection } from "../../../../lib/ilo";
import { requireAuth } from "../../../../lib/auth";
import { isValidHost, isValidPort, verifyCsrf } from "../../../../lib/validation";
import { IloConfig } from "../../../../types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid Origin / CSRF Rejected" }, { status: 403 });
  }

  try {
    let customConfig: Partial<IloConfig> | undefined = undefined;
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (body.host !== undefined && body.host !== "") {
          if (!isValidHost(body.host)) {
            return NextResponse.json(
              { restOk: false, sshOk: false, restMessage: "Địa chỉ IP / Hostname iLO không hợp lệ.", sshMessage: "Host không hợp lệ" },
              { status: 400 }
            );
          }
        }
        if (body.sshPort !== undefined && !isValidPort(body.sshPort)) {
          return NextResponse.json(
            { restOk: false, sshOk: false, restMessage: "Cổng SSH không hợp lệ.", sshMessage: "Cổng SSH không hợp lệ" },
            { status: 400 }
          );
        }
        if (body.httpPort !== undefined && !isValidPort(body.httpPort)) {
          return NextResponse.json(
            { restOk: false, sshOk: false, restMessage: "Cổng HTTP/HTTPS không hợp lệ.", sshMessage: "Cổng HTTP/HTTPS không hợp lệ" },
            { status: 400 }
          );
        }
        customConfig = body;
      }
    } catch {
      // Body is optional
    }

    const result = await testIloConnection(customConfig);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        restOk: false,
        sshOk: false,
        restMessage: "Lỗi test kết nối: " + (err instanceof Error ? err.message : String(err)),
        sshMessage: "Không thể thực hiện kiểm tra SSH",
      },
      { status: 500 }
    );
  }
}
