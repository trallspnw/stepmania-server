import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const children = await prisma.user.findMany({
    where: { isChild: true, isActive: true },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
    },
  });

  return NextResponse.json(children);
}
