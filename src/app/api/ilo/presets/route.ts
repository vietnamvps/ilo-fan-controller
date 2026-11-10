import { NextRequest, NextResponse } from "next/server";
import { getPresets, savePresets } from "@/lib/storage";
import { FanPreset } from "@/types";

export async function GET() {
  const presets = getPresets();
  return NextResponse.json(presets);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      // Overwrite all presets
      savePresets(body as FanPreset[]);
      return NextResponse.json({ success: true, presets: body });
    }

    if (body.action === "add" && body.preset) {
      const presets = getPresets();
      const newPreset: FanPreset = {
        id: "preset-" + Date.now(),
        name: body.preset.name || "Custom Preset",
        description: body.preset.description || "",
        speeds: Array.isArray(body.preset.speeds) ? body.preset.speeds : [20, 20, 20, 20, 20, 20],
        icon: body.preset.icon || "Sliders",
      };
      presets.push(newPreset);
      savePresets(presets);
      return NextResponse.json({ success: true, presets });
    }

    if (body.action === "delete" && body.id) {
      let presets = getPresets();
      presets = presets.filter((p) => p.id !== body.id);
      savePresets(presets);
      return NextResponse.json({ success: true, presets });
    }

    return NextResponse.json({ error: "Hành động preset không hợp lệ" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Lỗi xử lý preset: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
