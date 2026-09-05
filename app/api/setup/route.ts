import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTakenIdentityField,
  hasAdminUser,
  normalizeDisplayName,
  normalizeLoginName,
} from "@/lib/users";

export async function POST(request: Request) {
  if (await hasAdminUser()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const loginName = String(body?.loginName ?? "").trim();
  const displayName = String(body?.displayName ?? "").trim();
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!loginName || !displayName || !password || !confirmPassword) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        loginName,
        loginNameNormalized: normalizeLoginName(loginName),
        displayName,
        displayNameNormalized: normalizeDisplayName(displayName),
        passwordHash,
        isAdmin: true,
      },
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

  return NextResponse.json({ ok: true, redirectTo: "/admin" });
}
