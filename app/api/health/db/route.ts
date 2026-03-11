import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";

export async function GET() {
  try {
    const connection = await checkDatabaseConnection();

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
