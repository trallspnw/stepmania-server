/**
 * Joining another player's queued song as P2 (POST, with the joiner's chart)
 * and leaving it again (DELETE). Both answer with the refreshed queue.
 */
import { NextResponse } from "next/server";
import { getEffectiveActor } from "@/lib/admin";
import { getQueueEntriesForUser, joinQueueEntry, leaveQueueEntry } from "@/lib/queue-server";

interface RouteContext {
  params: Promise<{
    entryId: string;
  }>;
}

function getErrorStatus(message: string) {
  switch (message) {
    case "Forbidden":
      return 403;
    case "Queue entry not found.":
      return 404;
    case "This song has already started.":
    case "Someone has already joined this song.":
      return 409;
    default:
      return 400;
  }
}

async function readEntryId(context: RouteContext) {
  const { entryId: rawEntryId } = await context.params;
  const entryId = Number(rawEntryId);
  return Number.isInteger(entryId) && entryId > 0 ? entryId : null;
}

export async function POST(request: Request, context: RouteContext) {
  const result = await getEffectiveActor();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entryId = await readEntryId(context);
  const payload = (await request.json().catch(() => null)) as { chartId?: number } | null;
  const chartId = Number(payload?.chartId);

  if (entryId === null || !Number.isInteger(chartId) || chartId <= 0) {
    return NextResponse.json({ error: "Valid entry id and chartId are required." }, { status: 400 });
  }

  try {
    await joinQueueEntry({
      entryId,
      joinerUserId: result.activeUser.id,
      chartId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join song.";
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }

  const entries = await getQueueEntriesForUser(result.activeUser.id, result.user.isAdmin);

  return NextResponse.json({
    entries,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const result = await getEffectiveActor();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entryId = await readEntryId(context);

  if (entryId === null) {
    return NextResponse.json({ error: "Invalid queue entry id." }, { status: 400 });
  }

  try {
    await leaveQueueEntry({
      entryId,
      requesterUserId: result.activeUser.id,
      requesterIsAdmin: result.user.isAdmin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to leave song.";
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }

  const entries = await getQueueEntriesForUser(result.activeUser.id, result.user.isAdmin);

  return NextResponse.json({
    entries,
  });
}
