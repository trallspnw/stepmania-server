import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [connection] = await prisma.$queryRaw<
      { now: string; current_database: string; current_user: string }[]
    >`select now()::text, current_database(), current_user`;

    return NextResponse.json({
      ok: true,
      database: connection.current_database,
      user: connection.current_user,
      time: connection.now,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
