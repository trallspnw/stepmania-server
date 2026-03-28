import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { entryId } = await context.params;
  const parsedEntryId = Number.parseInt(entryId, 10);

  if (!Number.isInteger(parsedEntryId) || parsedEntryId <= 0) {
    return NextResponse.json({ error: "Invalid history entry id" }, { status: 400 });
  }

  const existingEntry = await prisma.playHistory.findUnique({
    where: { id: parsedEntryId },
    select: { id: true, isTest: true },
  });

  if (!existingEntry) {
    return NextResponse.json({ error: "History entry not found" }, { status: 404 });
  }

  await prisma.playHistory.delete({
    where: { id: parsedEntryId },
  });

  const testCount = await prisma.playHistory.count({
    where: { isTest: true },
  });

  return NextResponse.json({
    deleted: true,
    id: parsedEntryId,
    wasTest: existingEntry.isTest,
    testCount,
  });
}
