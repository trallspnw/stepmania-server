import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { getRecentPlayHistory } from "@/lib/play-history";

export async function GET() {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getRecentPlayHistory();

  return NextResponse.json({
    entries,
  });
}
