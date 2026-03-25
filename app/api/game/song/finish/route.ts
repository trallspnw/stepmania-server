// curl -X POST http://localhost:3000/api/game/song/finish
// curl -X POST http://localhost:3000/api/game/song/finish \
//   -H "Authorization: Bearer {your_token}" \
//   -H "Content-Type: application/json" \
//   -d '{"score": 100.00, "grade": "AAA"}'
// curl -X POST http://localhost:3000/api/game/song/finish \
//   -H "Authorization: Bearer {your_token}" \
//   -H "Content-Type: application/json" \
//   -d '{"score": 75.23, "grade": "B"}'

import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { consumeCurrentQueueEntry } from "@/lib/queue-server";
import { getSetting, setSettings } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const score = Number(body?.score);
  const grade =
    typeof body?.grade === "string"
      ? body.grade.trim()
      : "";

  if (!Number.isFinite(score) || score < 0) {
    return NextResponse.json(
      { error: "score must be a non-negative decimal value" },
      { status: 400 },
    );
  }

  if (!grade) {
    return NextResponse.json(
      { error: "grade must be a non-empty string" },
      { status: 400 },
    );
  }

  const consumed = await consumeCurrentQueueEntry();

  if (consumed) {
    console.log("[finish] score received:", {
      songPath: consumed.removed.song.filePath,
      playerId: consumed.removed.user.id,
      score,
      grade,
      playedAt: new Date().toISOString(),
    });

    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 200,
      hasSong: true,
      finishedSongPath: consumed.removed.song.filePath,
      playerId: consumed.removed.user.id,
      queueEntryId: consumed.removed.id,
      nextSongPath: consumed.next?.song.filePath ?? null,
      score,
      grade,
    });

    return NextResponse.json({
      recorded: false,
      user_highscore: null,
      server_highscore: null,
      next_song: consumed.next
        ? {
            file_path: consumed.next.song.filePath,
            difficulty_name: consumed.next.chart.difficultySlot,
          }
        : null,
    });
  }

  const currentSongPath = (await getSetting(SETTING_KEYS.CURRENT_SONG_PATH))?.trim() ?? "";
  const currentPlayerId = await getSetting(SETTING_KEYS.CURRENT_PLAYER_ID);

  if (!currentSongPath) {
    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: false,
      score,
      grade,
    });

    return NextResponse.json({ error: "No current song set" }, { status: 400 });
  }

  // TODO: when play_history is implemented, insert record here before clearing settings
  console.log("[finish] score received:", {
    songPath: currentSongPath,
    playerId: currentPlayerId,
    score,
    grade,
    playedAt: new Date().toISOString(),
  });

  await setSettings([
    { key: SETTING_KEYS.CURRENT_SONG_PATH, value: "" },
    { key: SETTING_KEYS.CURRENT_SONG_DIFFICULTY, value: "" },
    { key: SETTING_KEYS.CURRENT_PLAYER_ID, value: "" },
  ]);

  console.info("[machine] game.song.finish", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
    hasSong: true,
    finishedSongPath: currentSongPath,
    playerId: currentPlayerId,
    score,
    grade,
  });

  // TODO: when play_history is implemented, query updated high scores and return here
  return NextResponse.json({
    recorded: false,
    user_highscore: null,
    server_highscore: null,
  });
}
