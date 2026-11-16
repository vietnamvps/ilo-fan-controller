import { NextResponse } from "next/server";
import { fetchServerThermal } from "../../../../lib/ilo";
import { requireAuth } from "../../../../lib/auth";
import { getSmartAutoState, startSmartAutoDaemon } from "../../../../lib/smart-auto";

export const dynamic = "force-dynamic";

startSmartAutoDaemon();

export async function GET() {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  try {
    const data = await fetchServerThermal();
    const smartAuto = getSmartAutoState();
    return NextResponse.json({
      ...data,
      smartAuto,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi truy xuất dữ liệu Thermal từ iLO: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
