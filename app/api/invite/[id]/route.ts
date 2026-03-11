import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDisplayName } from "@/lib/users";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const displayName = String(body?.displayName ?? "").trim();
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!displayName || !password || !confirmPassword) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
  }

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

  return NextResponse.json({ ok: true, redirectTo });
}
