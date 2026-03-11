import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = Number(id);

  if (targetUserId === Number(session.user.id)) {
    return NextResponse.json({ error: "Cannot change your own status" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: !user.isActive },
  });

  return NextResponse.json({
    id: updatedUser.id,
    displayName: updatedUser.displayName,
    isAdmin: updatedUser.isAdmin,
    isActive: updatedUser.isActive,
    createdAt: updatedUser.createdAt.toISOString(),
  });
}
