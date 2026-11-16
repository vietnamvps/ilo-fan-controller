import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";
import { verifyCsrf } from "../../../../lib/validation";
import { getSmartAutoState, setSmartAutoEnabled, startSmartAutoDaemon } from "../../../../lib/smart-auto";

export const dynamic = "force-dynamic";

// Đảm bảo daemon ngầm khởi động
startSmartAutoDaemon();

export async function GET() {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  const state = getSmartAutoState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid Origin / CSRF Rejected" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "Tham số 'enabled' phải là boolean (true/false)" }, { status: 400 });
    }

    const nextState = setSmartAutoEnabled(body.enabled);
    return NextResponse.json({
      success: true,
      state: nextState,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Lỗi thiết lập Smart Auto: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
