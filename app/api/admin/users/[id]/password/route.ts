import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = Number(id);

  if (targetUserId === Number(session.user.id)) {
    return NextResponse.json({ error: "Cannot reset your own password here" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const password = String(body?.password ?? "");

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      // Existing JWT sessions for the target user remain valid until expiry.
      // Forced logout is a known limitation of the current JWT strategy.
    },
  });

  return NextResponse.json({ ok: true });
}
