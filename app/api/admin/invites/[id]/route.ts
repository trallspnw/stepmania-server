import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invite = await prisma.invite.findUnique({
    where: { id },
  });

  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (invite.claimedAt || invite.claimedBy) {
    return NextResponse.json({ error: "Claimed invite cannot be revoked" }, { status: 403 });
  }

  await prisma.invite.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
