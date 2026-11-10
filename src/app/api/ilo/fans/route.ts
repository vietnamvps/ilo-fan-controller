import { NextRequest, NextResponse } from "next/server";
import { setFanSpeeds } from "../../../../lib/ilo";
import { getIloConfig } from "../../../../lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = getIloConfig();

    let fansToUpdate: { index: number; speed: number }[] = [];

    if (typeof body.allSpeed === "number") {
      // Set all 6 fans of DL380 G9
      for (let i = 0; i < 6; i++) {
        fansToUpdate.push({ index: i, speed: body.allSpeed });
      }
    } else if (Array.isArray(body.fans)) {
      // Direct array [{ index: 0, speed: 25 }, ...]
      fansToUpdate = body.fans.map((f: { index: number; speed: number }) => ({
        index: Number(f.index),
        speed: Number(f.speed),
      }));
    } else if (typeof body.fans === "object" && body.fans !== null) {
      // Legacy dictionary format: { "Fan 1": 20, "Fan 2": 30 }
      const keys = Object.keys(body.fans);
      fansToUpdate = keys.map((key) => {
        const match = key.match(/\d+/);
        const idx = match ? parseInt(match[0], 10) - 1 : 0;
        return {
          index: idx,
          speed: Number(body.fans[key]),
        };
      });
    } else if (typeof body.fans === "number") {
      for (let i = 0; i < 6; i++) {
        fansToUpdate.push({ index: i, speed: body.fans });
      }
    } else {
      return NextResponse.json({ error: "Tham số quạt không hợp lệ" }, { status: 400 });
    }

    if (fansToUpdate.length === 0) {
      return NextResponse.json({ error: "Không có quạt nào được chỉ định để cập nhật" }, { status: 400 });
    }

    const result = await setFanSpeeds(fansToUpdate);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi thực thi lệnh quạt: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
