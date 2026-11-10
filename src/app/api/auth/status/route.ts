import { NextResponse } from "next/server";
import { hasAdminUser } from "../../../../lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasAdmin = hasAdminUser();
  return NextResponse.json({
    needsSetup: !hasAdmin,
    hasAdmin,
  });
}
