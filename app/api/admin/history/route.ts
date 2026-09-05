import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { clearTestPlayHistory, getPaginatedPlayHistory } from "@/lib/play-history";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

export async function GET(request: Request) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const [{ total, entries }, testCount] = await Promise.all([
    getPaginatedPlayHistory({ page, pageSize: PAGE_SIZE }),
    prisma.playHistory.count({
      where: {
        isTest: true,
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    entries,
    testCount,
  });
}

export async function DELETE() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deleted = await clearTestPlayHistory();

  return NextResponse.json({
    deleted: deleted.count,
  });
}
