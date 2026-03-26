import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { startCurrentQueueEntry } from "@/lib/queue-server";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedEntry = await startCurrentQueueEntry();

  if (!startedEntry) {
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
    songPath: startedEntry.song.filePath,
    playerId: startedEntry.user.id,
    queueEntryId: startedEntry.id,
  });

  return NextResponse.json({
    ok: true,
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
