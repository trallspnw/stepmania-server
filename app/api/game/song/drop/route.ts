// curl -X POST http://localhost:3000/api/game/song/drop \
//   -H "Authorization: Bearer {your_token}" \
//   -H "Content-Type: application/json" \
//   -d '{"queue_item_id": 42}'

/**
 * Drops side 2 (the player who joined) from the current song without skipping
 * it, for the cabinet's "Drop out" option. Only before the song starts.
 */
import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { dropCurrentQueueEntryJoin } from "@/lib/queue-server";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const queueItemId = Number(body?.queue_item_id);

  if (!Number.isInteger(queueItemId) || queueItemId <= 0) {
    return NextResponse.json(
      { error: "queue_item_id must be a positive integer" },
      { status: 400 },
    );
  }

  const dropped = await dropCurrentQueueEntryJoin(queueItemId);

  if (dropped.status === "dropped") {
    console.info("[machine] game.song.drop", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 200,
      queueEntryId: dropped.entry.id,
      droppedPlayerId: dropped.droppedUser?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      queue_item_id: dropped.entry.id,
      dropped: dropped.droppedUser
        ? { id: dropped.droppedUser.id, display_name: dropped.droppedUser.displayName }
        : null,
    });
  }

  if (dropped.status === "started") {
    console.info("[machine] game.song.drop", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 409,
      queueEntryId: dropped.current.id,
    });

    return NextResponse.json({ error: "The song has already started" }, { status: 409 });
  }

  if (dropped.status === "mismatch") {
    console.warn("[machine] game.song.drop", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: dropped.current.id,
    });

    return NextResponse.json(
      { error: "queue_item_id does not match the current queue item" },
      { status: 400 },
    );
  }

  return NextResponse.json({ error: "No current song set" }, { status: 400 });
}
