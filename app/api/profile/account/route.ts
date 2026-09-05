import { NextResponse } from "next/server";
import { getEffectiveActor, getSessionUserRecord } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteUserAndOwnedData } from "@/lib/user-deletion";
import { getTakenIdentityField, normalizeDisplayName, normalizeLoginName } from "@/lib/users";

export async function PUT(request: Request) {
  const result = await getEffectiveActor();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const isChild = result.activeUser.isChild;
  const loginName =
    body?.loginName === undefined || isChild ? undefined : String(body.loginName).trim();
  const displayName =
    body?.displayName === undefined ? undefined : String(body.displayName).trim();

  if (loginName === undefined && displayName === undefined) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (loginName === "" || displayName === "") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: result.activeUser.id },
      data: {
        ...(loginName !== undefined
          ? { loginName, loginNameNormalized: normalizeLoginName(loginName) }
          : {}),
        ...(displayName !== undefined
          ? { displayName, displayNameNormalized: normalizeDisplayName(displayName) }
          : {}),
      },
      select: {
        id: true,
        loginName: true,
        displayName: true,
        isAdmin: true,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const takenField = getTakenIdentityField(error);

    if (takenField === "login") {
      return NextResponse.json({ error: "login_name_taken" }, { status: 409 });
    }

    if (takenField === "display") {
      return NextResponse.json({ error: "display_name_taken" }, { status: 409 });
    }

    throw error;
  }
}

export async function DELETE() {
  // Deliberately uses getSessionUserRecord (not getEffectiveActor): this always deletes the
  // real logged-in adult's own account, even while acting as a child. There is no code path
  // here that could delete a child — child deletion only happens via the admin console.
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteUserAndOwnedData(result.user.id);

  return NextResponse.json({ ok: true });
}
