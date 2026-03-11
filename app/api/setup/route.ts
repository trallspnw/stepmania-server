import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminUser, normalizeDisplayName } from "@/lib/users";

function getRedirectUrl(request: Request, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return new URL(path, `${forwardedProto ?? "https"}://${host}`);
  }

  if (process.env.NEXTAUTH_URL) {
    return new URL(path, process.env.NEXTAUTH_URL);
  }

  return new URL(path, request.url);
}

export async function POST(request: Request) {
  if (await hasAdminUser()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!displayName || !password || !confirmPassword) {
    return NextResponse.redirect(getRedirectUrl(request, "/setup?error=missing_fields"), 303);
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/setup?error=password_too_short"),
      303,
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/setup?error=password_mismatch"),
      303,
    );
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
      return NextResponse.redirect(
        getRedirectUrl(request, "/setup?error=display_name_taken"),
        303,
      );
    }

    throw error;
  }

  return NextResponse.redirect(getRedirectUrl(request, "/login"), 303);
}
