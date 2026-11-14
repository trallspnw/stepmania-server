/**
 * Creates a player account without an invite, while open sign-up is on.
 */
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { getNameTakenError, readNewAccountFields } from "@/lib/new-account";
import { prisma } from "@/lib/prisma";
import { isOpenSignUpEnabled } from "@/lib/sign-up";
import { normalizeDisplayName, normalizeLoginName } from "@/lib/users";

export async function POST(request: Request) {
  if (!(await isOpenSignUpEnabled())) {
    return NextResponse.json({ error: "sign_up_closed" }, { status: 403 });
  }

  const result = readNewAccountFields(await request.json().catch(() => null));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { loginName, displayName, password } = result.fields;

  try {
    await prisma.user.create({
      data: {
        loginName,
        loginNameNormalized: normalizeLoginName(loginName),
        displayName,
        displayNameNormalized: normalizeDisplayName(displayName),
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
  } catch (error) {
    const nameTakenError = getNameTakenError(error);

    if (nameTakenError) {
      return NextResponse.json({ error: nameTakenError }, { status: 409 });
    }

    throw error;
  }

  return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
}
