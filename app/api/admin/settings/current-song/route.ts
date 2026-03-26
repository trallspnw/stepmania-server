import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { normalizeLibraryGameMode } from "@/lib/library-mode";
import { getSetting, setSettings } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

export async function GET() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const libraryGameMode = await getSetting(SETTING_KEYS.LIBRARY_GAME_MODE);

  return NextResponse.json({
    libraryGameMode: normalizeLibraryGameMode(libraryGameMode),
  });
}

export async function PUT(request: Request) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const libraryGameMode = normalizeLibraryGameMode(
    typeof body.libraryGameMode === "string" ? body.libraryGameMode : null,
  );

  await setSettings([
    {
      key: SETTING_KEYS.LIBRARY_GAME_MODE,
      value: libraryGameMode,
    },
  ]);

  return NextResponse.json({ ok: true });
}
