import { NextResponse } from "next/server";
import { hasAdminUser } from "../../../../lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hasAdmin = await hasAdminUser();
    return NextResponse.json({
      needsSetup: !hasAdmin,
      hasAdmin,
    });
  } catch (err: unknown) {
    console.error("Lỗi kiểm tra trạng thái Admin:", err);
    return NextResponse.json({
      needsSetup: true,
      hasAdmin: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
