import { NextRequest, NextResponse } from "next/server";
import { testIloConnection } from "../../../../lib/ilo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let customConfig = undefined;
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
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
