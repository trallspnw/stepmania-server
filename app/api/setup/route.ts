import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminUser, normalizeDisplayName } from "@/lib/users";

export async function POST(request: Request) {
  if (await hasAdminUser()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        displayName,
        displayNameNormalized: normalizeDisplayName(displayName),
        passwordHash,
        isAdmin: true,
      },
    });
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

  return NextResponse.json({ ok: true, redirectTo: "/admin" });
}
