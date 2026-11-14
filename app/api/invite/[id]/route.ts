import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { getNameTakenError, readNewAccountFields } from "@/lib/new-account";
import { prisma } from "@/lib/prisma";
import { normalizeDisplayName, normalizeLoginName } from "@/lib/users";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = readNewAccountFields(await request.json().catch(() => null));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { loginName, displayName, password } = result.fields;

  let redirectTo = "/dashboard";

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: { id },
      });

      if (!invite || invite.claimedAt || invite.claimedBy || invite.expiresAt <= new Date()) {
        throw new Error("invite_invalid");
      }

      redirectTo = invite.roleIsAdmin ? "/admin" : "/dashboard";

      const user = await tx.user.create({
        data: {
          loginName,
          loginNameNormalized: normalizeLoginName(loginName),
          displayName,
          displayNameNormalized: normalizeDisplayName(displayName),
          passwordHash,
          isAdmin: invite.roleIsAdmin,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          claimedBy: user.id,
          claimedAt: new Date(),
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invite_invalid") {
      return NextResponse.json({ error: "invalid_invite" }, { status: 400 });
    }

    const nameTakenError = getNameTakenError(error);

    if (nameTakenError) {
      return NextResponse.json({ error: nameTakenError }, { status: 409 });
    }

    throw error;
  }

  return NextResponse.json({ ok: true, redirectTo });
}
