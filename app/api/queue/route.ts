import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { addQueueEntry, getQueueEntriesForUser } from "@/lib/queue-server";

export async function GET() {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getQueueEntriesForUser(result.user.id, result.user.isAdmin);

  return NextResponse.json({
    entries,
  });
}

export async function POST(request: Request) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        songId?: number;
        chartId?: number;
      }
    | null;

  const songId = Number(payload?.songId);
  const chartId = Number(payload?.chartId);

  if (!Number.isInteger(songId) || songId <= 0 || !Number.isInteger(chartId) || chartId <= 0) {
    return NextResponse.json({ error: "Valid songId and chartId are required." }, { status: 400 });
  }

  try {
    await addQueueEntry({
      userId: result.user.id,
      songId,
      chartId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add queue entry.",
      },
      { status: 400 },
    );
  }

  const entries = await getQueueEntriesForUser(result.user.id, result.user.isAdmin);

  return NextResponse.json({
    entries,
  });
}
