import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getTakenIdentityField, normalizeDisplayName } from "@/lib/users";

export async function POST(request: Request) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const displayName = body?.displayName === undefined ? undefined : String(body.displayName).trim();

  if (!displayName) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const createdUser = await prisma.user.create({
      data: {
        displayName,
        displayNameNormalized: normalizeDisplayName(displayName),
        loginName: null,
        loginNameNormalized: null,
        passwordHash: null,
        isChild: true,
        isAdmin: false,
        isActive: true,
      },
    });

    return NextResponse.json({
      id: createdUser.id,
      loginName: createdUser.loginName,
      displayName: createdUser.displayName,
      isAdmin: createdUser.isAdmin,
      isActive: createdUser.isActive,
      isChild: createdUser.isChild,
      createdAt: createdUser.createdAt.toISOString(),
    });
  } catch (error) {
    const takenField = getTakenIdentityField(error);

    if (takenField === "display") {
      return NextResponse.json({ error: "display_name_taken" }, { status: 409 });
    }

    throw error;
  }
}
