import { NextRequest, NextResponse } from "next/server";
import { getPresets, savePresets } from "../../../../lib/storage";
import { requireAuth } from "../../../../lib/auth";
import { isValidPresetName, isValidFanSpeed, verifyCsrf } from "../../../../lib/validation";
import { FanPreset } from "../../../../types";

export const dynamic = "force-dynamic";

export async function GET() {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  const presets = await getPresets();
  return NextResponse.json(presets);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid Origin / CSRF Rejected" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      // Validate all presets
      for (const p of body) {
        if (!isValidPresetName(p.name)) {
          return NextResponse.json({ error: "Tên preset không hợp lệ (1-50 ký tự)." }, { status: 400 });
        }
        if (!Array.isArray(p.speeds) || p.speeds.some((s: number) => !isValidFanSpeed(s))) {
          return NextResponse.json({ error: "Tốc độ quạt trong preset không hợp lệ (0-100)." }, { status: 400 });
        }
      }
      await savePresets(body as FanPreset[]);
      return NextResponse.json({ success: true, presets: body });
    }

    if (body.action === "add" && body.preset) {
      if (!isValidPresetName(body.preset.name)) {
        return NextResponse.json({ error: "Tên preset không hợp lệ (1-50 ký tự)." }, { status: 400 });
      }

      const rawSpeeds = Array.isArray(body.preset.speeds) ? body.preset.speeds : [20, 20, 20, 20, 20, 20];
      const validSpeeds = rawSpeeds.map((s: number) => (isValidFanSpeed(Number(s)) ? Number(s) : 20));

      const presets = await getPresets();
      const newPreset: FanPreset = {
        id: "preset-" + Date.now(),
        name: body.preset.name.trim(),
        description: typeof body.preset.description === "string" ? body.preset.description.slice(0, 200) : "",
        speeds: validSpeeds,
        icon: typeof body.preset.icon === "string" ? body.preset.icon.slice(0, 30) : "Sliders",
      };
      presets.push(newPreset);
      await savePresets(presets);
      return NextResponse.json({ success: true, presets });
    }

    if (body.action === "delete" && body.id) {
      let presets = await getPresets();
      presets = presets.filter((p: FanPreset) => p.id !== body.id);
      await savePresets(presets);
      return NextResponse.json({ success: true, presets });
    }

    return NextResponse.json({ error: "Hành động preset không hợp lệ" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Lỗi xử lý preset: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid Origin / CSRF Rejected" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID preset để xóa" }, { status: 400 });
    }
    let presets = await getPresets();
    presets = presets.filter((p: FanPreset) => p.id !== id);
    await savePresets(presets);
    return NextResponse.json({ success: true, presets });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi xóa preset: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
