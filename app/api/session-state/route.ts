import { NextResponse } from "next/server";
import { getEffectiveActor } from "@/lib/admin";

export async function GET() {
  const result = await getEffectiveActor();

  if (!result) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: result.user.id,
      loginName: result.user.loginName,
      displayName: result.user.displayName,
      isAdmin: result.user.isAdmin,
      isActive: result.user.isActive,
    },
    activeUser: {
      id: result.activeUser.id,
      displayName: result.activeUser.displayName,
      isAdmin: result.activeUser.isAdmin,
      isChild: result.activeUser.isChild,
    },
  });
}
