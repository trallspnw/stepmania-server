import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { startCurrentQueueEntry } from "@/lib/queue-server";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedEntry = await startCurrentQueueEntry();

  if (!startedEntry) {
    const songPath = (await getSetting(SETTING_KEYS.CURRENT_SONG_PATH))?.trim() ?? "";

    if (!songPath) {
      console.info("[machine] game.song.start", {
        machineTokenId: machineToken.id,
        machineTokenName: machineToken.name,
        status: 400,
        hasSong: false,
      });

      return NextResponse.json({ error: "No current song set" }, { status: 400 });
    }

    console.info("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 200,
      hasSong: true,
      songPath,
      queued: false,
    });

    return NextResponse.json({ ok: true, queued: false });
  }

  console.info("[machine] game.song.start", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
    hasSong: true,
    songPath: startedEntry.song.filePath,
    playerId: startedEntry.user.id,
    queueEntryId: startedEntry.id,
    queued: true,
  });

  return NextResponse.json({
    ok: true,
    queued: true,
    song: {
      file_path: startedEntry.song.filePath,
      difficulty_name: startedEntry.chart.difficultySlot,
    },
    player: {
      id: startedEntry.user.id,
      display_name: startedEntry.user.displayName,
    },
  });
}
