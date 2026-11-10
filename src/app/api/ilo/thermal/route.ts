import { NextResponse } from "next/server";
import { fetchServerThermal } from "../../../../lib/ilo";

export async function GET() {
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
