// curl -X POST http://localhost:3000/api/game/song/skip
// curl -X POST http://localhost:3000/api/game/song/skip \
//   -H "Authorization: Bearer {your_token}"
// curl -X POST http://localhost:3000/api/game/song/skip \
//   -H "Authorization: Bearer {your_token}"

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

  const consumed = await consumeCurrentQueueEntry();

  if (consumed) {
    console.info("[machine] game.song.skip", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 200,
      hasSong: true,
      skippedSongPath: consumed.removed.song.filePath,
      playerId: consumed.removed.user.id,
      queueEntryId: consumed.removed.id,
      nextSongPath: consumed.next?.song.filePath ?? null,
    });

    return NextResponse.json({
      ok: true,
      skipped: {
        file_path: consumed.removed.song.filePath,
        difficulty_name: consumed.removed.chart.difficultySlot,
      },
      next_song: consumed.next
        ? {
            file_path: consumed.next.song.filePath,
            difficulty_name: consumed.next.chart.difficultySlot,
          }
        : null,
    });
  }

  const songPath = (await getSetting(SETTING_KEYS.CURRENT_SONG_PATH))?.trim() ?? "";
  const currentPlayerId = await getSetting(SETTING_KEYS.CURRENT_PLAYER_ID);

  if (!songPath) {
    console.info("[machine] game.song.skip", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: false,
    });

    return NextResponse.json({ error: "No current song set" }, { status: 400 });
  }

  await setSettings([
    { key: SETTING_KEYS.CURRENT_SONG_PATH, value: "" },
    { key: SETTING_KEYS.CURRENT_SONG_DIFFICULTY, value: "" },
    { key: SETTING_KEYS.CURRENT_PLAYER_ID, value: "" },
  ]);

  console.info("[machine] game.song.skip", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
    hasSong: true,
    skippedSongPath: songPath,
    playerId: currentPlayerId,
  });

  return NextResponse.json({ ok: true });
}
