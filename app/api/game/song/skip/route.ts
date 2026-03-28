// curl -X POST http://localhost:3000/api/game/song/skip
// curl -X POST http://localhost:3000/api/game/song/skip \
//   -H "Authorization: Bearer {your_token}"
// curl -X POST http://localhost:3000/api/game/song/skip \
//   -H "Authorization: Bearer {your_token}"

import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { consumeCurrentQueueEntryWithExpectedId } from "@/lib/queue-server";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const queueItemId = Number(body?.queue_item_id);

  if (!Number.isInteger(queueItemId) || queueItemId <= 0) {
    console.info("[machine] game.song.skip", {
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

  const consumed = await consumeCurrentQueueEntryWithExpectedId(queueItemId);

  if (consumed.status === "consumed") {
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
            queue_item_id: consumed.next.id,
            file_path: consumed.next.song.filePath,
            difficulty_name: consumed.next.chart.difficultySlot,
          }
        : null,
    });
  }

  if (consumed.status === "mismatch") {
    console.warn("[machine] game.song.skip", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: consumed.current.id,
      actualSongPath: consumed.current.song.filePath,
    });

    return NextResponse.json(
      { error: "queue_item_id does not match the current queue item" },
      { status: 400 },
    );
  }

  console.info("[machine] game.song.skip", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 400,
    hasSong: false,
  });

  return NextResponse.json({ error: "No current song set" }, { status: 400 });
}
