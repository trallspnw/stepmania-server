import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { normalizeLibraryGameMode } from "@/lib/library-mode";
import { getSetting, setSettings } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

const validDifficulties = new Set(["Beginner", "Easy", "Medium", "Hard", "Expert", "Custom"]);

export async function GET() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [songPath, difficulty, playerId, libraryGameMode] = await Promise.all([
    getSetting(SETTING_KEYS.CURRENT_SONG_PATH),
    getSetting(SETTING_KEYS.CURRENT_SONG_DIFFICULTY),
    getSetting(SETTING_KEYS.CURRENT_PLAYER_ID),
    getSetting(SETTING_KEYS.LIBRARY_GAME_MODE),
  ]);

  return NextResponse.json({
    songPath,
    difficulty,
    playerId,
    libraryGameMode: normalizeLibraryGameMode(libraryGameMode),
  });
}

export async function PUT(request: Request) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const songPath = typeof body.songPath === "string" ? body.songPath.trim() : "";
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "";
  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const libraryGameMode = normalizeLibraryGameMode(
    typeof body.libraryGameMode === "string" ? body.libraryGameMode : null,
  );

  if (difficulty && !validDifficulties.has(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  await setSettings([
    {
      key: SETTING_KEYS.CURRENT_SONG_PATH,
      value: songPath || null,
    },
    {
      key: SETTING_KEYS.CURRENT_SONG_DIFFICULTY,
      value: difficulty || null,
    },
    {
      key: SETTING_KEYS.CURRENT_PLAYER_ID,
      value: playerId || null,
    },
    {
      key: SETTING_KEYS.LIBRARY_GAME_MODE,
      value: libraryGameMode,
    },
  ]);

  return NextResponse.json({ ok: true });
}
