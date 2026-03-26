import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { clearTestPlayHistory, getRecentPlayHistory } from "@/lib/play-history";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [entries, testCount] = await Promise.all([
    getRecentPlayHistory(),
    prisma.playHistory.count({
      where: {
        isTest: true,
      },
    }),
  ]);

  return NextResponse.json({
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
