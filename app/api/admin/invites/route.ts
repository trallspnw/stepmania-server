import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminSession, getRequestBaseUrl } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const roleIsAdmin = body?.role === "admin";
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: {
      id: token,
      createdBy: result.user.id,
      roleIsAdmin,
      expiresAt,
    },
  });

  return NextResponse.json({
    id: token,
    roleIsAdmin,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    url: `${getRequestBaseUrl(request)}/invite/${token}`,
  });
}
