import { NextRequest, NextResponse } from "next/server";
import { setFanSpeeds } from "../../../../lib/ilo";
import { requireAuth } from "../../../../lib/auth";
import { isValidFanIndex, isValidFanSpeed, verifyCsrf } from "../../../../lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Kiểm tra xác thực (Second-layer security defense)
  const authErr = await requireAuth();
  if (authErr) return authErr;

  // 2. Kiểm tra CSRF
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid Origin / CSRF Rejected" }, { status: 403 });
  }

  try {
    const body = await req.json();
    let fansToUpdate: { index: number; speed: number }[] = [];

    if (typeof body.allSpeed === "number") {
      if (!isValidFanSpeed(body.allSpeed)) {
        return NextResponse.json({ error: "Tốc độ quạt phải là số từ 0 đến 100" }, { status: 400 });
      }
      for (let i = 0; i < 6; i++) {
        fansToUpdate.push({ index: i, speed: body.allSpeed });
      }
    } else if (Array.isArray(body.fans)) {
      for (const f of body.fans) {
        const idx = Number(f.index);
        const spd = Number(f.speed);
        if (!isValidFanIndex(idx) || !isValidFanSpeed(spd)) {
          return NextResponse.json(
            { error: `Tham số quạt không hợp lệ (index: 0..5, speed: 0..100)` },
            { status: 400 }
          );
        }
        fansToUpdate.push({ index: idx, speed: spd });
      }
    } else if (typeof body.fans === "object" && body.fans !== null) {
      const keys = Object.keys(body.fans);
      for (const key of keys) {
        const match = key.match(/\d+/);
        const idx = match ? parseInt(match[0], 10) - 1 : 0;
        const spd = Number(body.fans[key]);
        if (!isValidFanIndex(idx) || !isValidFanSpeed(spd)) {
          return NextResponse.json(
            { error: `Tham số quạt không hợp lệ (index: 0..5, speed: 0..100)` },
            { status: 400 }
          );
        }
        fansToUpdate.push({ index: idx, speed: spd });
      }
    } else if (typeof body.fans === "number") {
      if (!isValidFanSpeed(body.fans)) {
        return NextResponse.json({ error: "Tốc độ quạt phải là số từ 0 đến 100" }, { status: 400 });
      }
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
