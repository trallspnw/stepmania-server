import { NextResponse } from "next/server";
import { ACTIVE_PROFILE_COOKIE, getSessionUserRecord } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const ACTIVE_PROFILE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function PUT(request: Request) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawUserId = body?.userId;

  if (rawUserId === null) {
    const response = NextResponse.json({
      activeUser: {
        id: result.user.id,
        displayName: result.user.displayName,
        isAdmin: result.user.isAdmin,
        isChild: false,
      },
    });
    response.cookies.delete(ACTIVE_PROFILE_COOKIE);
    return response;
  }

  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }

  const candidate = await prisma.user.findUnique({ where: { id: userId } });

  if (!candidate || !candidate.isChild || !candidate.isActive) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }

  const response = NextResponse.json({
    activeUser: {
      id: candidate.id,
      displayName: candidate.displayName,
      isAdmin: false,
      isChild: true,
    },
  });

  response.cookies.set(ACTIVE_PROFILE_COOKIE, String(candidate.id), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: ACTIVE_PROFILE_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
