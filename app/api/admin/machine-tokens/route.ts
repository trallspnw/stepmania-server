import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tokens = await prisma.machineToken.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    tokens.map((token) => ({
      id: token.id,
      name: token.name,
      tokenPrefix: token.token.slice(0, 8),
      lastSeen: token.lastSeen?.toISOString() ?? null,
      createdAt: token.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const tokenValue = crypto.randomBytes(32).toString("hex");
  const token = await prisma.machineToken.create({
    data: {
      name,
      token: tokenValue,
      createdBy: result.user.id,
    },
  });

  return NextResponse.json({
    id: token.id,
    name: token.name,
    token: tokenValue,
    tokenPrefix: token.token.slice(0, 8),
    lastSeen: null,
    createdAt: token.createdAt.toISOString(),
  });
}
