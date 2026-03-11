import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const password = String(body?.password ?? "");

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: result.user.id },
    data: {
      passwordHash,
      // Existing JWT sessions remain valid until expiry.
      // Forced logout is a known limitation of the current JWT strategy.
    },
  });

  return NextResponse.json({ ok: true });
}
