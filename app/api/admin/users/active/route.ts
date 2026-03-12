import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
    },
  });

  return NextResponse.json(
    users.map((user) => ({
      id: String(user.id),
      displayName: user.displayName,
    })),
  );
}
