import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteUserAndOwnedData } from "@/lib/user-deletion";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = Number(id);

  if (targetUserId === result.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account here" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      displayName: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteUserAndOwnedData(targetUserId);

  return NextResponse.json({
    ok: true,
    id: user.id,
    displayName: user.displayName,
  });
}
