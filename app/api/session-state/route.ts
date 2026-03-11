import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";

export async function GET() {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: result.user.id,
      displayName: result.user.displayName,
      isAdmin: result.user.isAdmin,
      isActive: result.user.isActive,
    },
  });
}
