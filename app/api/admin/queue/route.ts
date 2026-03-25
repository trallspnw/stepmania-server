import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { clearQueueEntries, getQueueEntriesForUser } from "@/lib/queue-server";

export async function GET() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await getQueueEntriesForUser(result.user.id, true);

  return NextResponse.json({
    entries,
  });
}

export async function DELETE() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await clearQueueEntries();

  return NextResponse.json({
    entries: [],
  });
}
