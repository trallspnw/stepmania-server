import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getIngestionStatus, startIngestion } from "@/lib/ingestion";

export async function GET() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(getIngestionStatus());
}

export async function POST() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const songsDir = process.env.SONGS_DIR ?? ".data/Songs";
  const started = startIngestion(songsDir);

  return NextResponse.json(started, {
    status: started.started ? 202 : 200,
  });
}
