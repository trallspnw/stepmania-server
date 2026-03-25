import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { getQueueEntriesForUser, removeQueueEntry } from "@/lib/queue-server";

interface RouteContext {
  params: Promise<{
    entryId: string;
  }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId: rawEntryId } = await context.params;
  const entryId = Number(rawEntryId);

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid queue entry id." }, { status: 400 });
  }

  try {
    await removeQueueEntry({
      entryId,
      requesterUserId: result.user.id,
      requesterIsAdmin: result.user.isAdmin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove queue entry.";
    const status = message === "Forbidden" ? 403 : message === "Queue entry not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }

  const entries = await getQueueEntriesForUser(result.user.id, result.user.isAdmin);

  return NextResponse.json({
    entries,
  });
}
