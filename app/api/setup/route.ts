import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminUser } from "@/lib/users";

export async function POST(request: Request) {
  if (await hasAdminUser()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!displayName || !password || !confirmPassword) {
    return NextResponse.redirect(new URL("/setup?error=missing_fields", request.url), 303);
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      new URL("/setup?error=password_too_short", request.url),
      303,
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(
      new URL("/setup?error=password_mismatch", request.url),
      303,
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        displayName,
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
      return NextResponse.redirect(
        new URL("/setup?error=display_name_taken", request.url),
        303,
      );
    }

    throw error;
  }

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
