import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteUserAndOwnedData } from "@/lib/user-deletion";
import { getTakenIdentityField, normalizeDisplayName, normalizeLoginName } from "@/lib/users";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = Number(id);

  const body = await request.json().catch(() => null);
  const loginName = body?.loginName === undefined ? undefined : String(body.loginName).trim();
  const displayName =
    body?.displayName === undefined ? undefined : String(body.displayName).trim();

  if (loginName === undefined && displayName === undefined) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (loginName === "" || displayName === "") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(loginName !== undefined
          ? { loginName, loginNameNormalized: normalizeLoginName(loginName) }
          : {}),
        ...(displayName !== undefined
          ? { displayName, displayNameNormalized: normalizeDisplayName(displayName) }
          : {}),
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      loginName: updatedUser.loginName,
      displayName: updatedUser.displayName,
      isAdmin: updatedUser.isAdmin,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt.toISOString(),
    });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = Number(id);

  if (targetUserId === result.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account here" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      displayName: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteUserAndOwnedData(targetUserId);

  return NextResponse.json({
    ok: true,
    id: user.id,
    displayName: user.displayName,
  });
}
