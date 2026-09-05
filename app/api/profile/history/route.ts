import { NextResponse } from "next/server";
import { getEffectiveActor } from "@/lib/admin";
import { getPaginatedPlayHistoryForUser } from "@/lib/play-history";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const result = await getEffectiveActor();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const { total, entries } = await getPaginatedPlayHistoryForUser({
    userId: result.activeUser.id,
    page,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    entries,
  });
}
