import { NextResponse } from "next/server";
import { fetchServerThermal } from "../../../../lib/ilo";
import { requireAuth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  try {
    const data = await fetchServerThermal();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi truy xuất dữ liệu Thermal từ iLO: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
