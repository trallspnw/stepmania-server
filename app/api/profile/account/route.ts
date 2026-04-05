import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteUserAndOwnedData } from "@/lib/user-deletion";
import { normalizeDisplayName } from "@/lib/users";

export async function PUT(request: Request) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const displayName = String(body?.displayName ?? "").trim();

  if (!displayName) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: result.user.id },
      data: {
        displayName,
        displayNameNormalized: normalizeDisplayName(displayName),
      },
      select: {
        id: true,
        displayName: true,
        isAdmin: true,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "display_name_taken" }, { status: 409 });
    }

    throw error;
  }
}

export async function DELETE() {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteUserAndOwnedData(result.user.id);

  return NextResponse.json({ ok: true });
}
