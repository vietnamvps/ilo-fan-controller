import { NextResponse } from "next/server";
import { testIloConnection } from "../../../../lib/ilo";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await testIloConnection();
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
