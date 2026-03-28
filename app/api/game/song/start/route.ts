import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { startCurrentQueueEntryWithExpectedId } from "@/lib/queue-server";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const queueItemId = Number(body?.queue_item_id);

  if (!Number.isInteger(queueItemId) || queueItemId <= 0) {
    console.info("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: body?.queue_item_id ?? null,
    });

    return NextResponse.json(
      { error: "queue_item_id must be a positive integer" },
      { status: 400 },
    );
  }

  const startedEntry = await startCurrentQueueEntryWithExpectedId(queueItemId);

  if (startedEntry.status === "missing") {
    console.info("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: false,
    });

    return NextResponse.json({ error: "No current song set" }, { status: 400 });
  }

  if (startedEntry.status === "mismatch") {
    console.warn("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: startedEntry.current.id,
      actualSongPath: startedEntry.current.song.filePath,
    });

    return NextResponse.json(
      { error: "queue_item_id does not match the current queue item" },
      { status: 400 },
    );
  }

  console.info("[machine] game.song.start", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
    hasSong: true,
    songPath: startedEntry.entry.song.filePath,
    playerId: startedEntry.entry.user.id,
    queueEntryId: startedEntry.entry.id,
  });

  return NextResponse.json({
    ok: true,
    queue_item_id: startedEntry.entry.id,
    song: {
      file_path: startedEntry.entry.song.filePath,
      difficulty_name: startedEntry.entry.chart.difficultySlot,
    },
    player: {
      id: startedEntry.entry.user.id,
      display_name: startedEntry.entry.user.displayName,
    },
  });
}
