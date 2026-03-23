import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

export async function GET(request: Request) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const [total, packs] = await Promise.all([
    prisma.pack.count(),
    prisma.pack.findMany({
      orderBy: [{ sortIndex: "asc" }, { folderName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: {
            songs: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    packs: packs.map((pack) => ({
      id: pack.id,
      folderName: pack.folderName,
      sortIndex: pack.sortIndex,
      titles: pack.titles,
      platforms: pack.platforms,
      regions: pack.regions,
      earliestRelease: pack.earliestRelease,
      source: pack.source,
      isCustom: pack.isCustom,
      isCommunity: pack.isCommunity,
      songCount: pack._count.songs,
      updatedAt: pack.updatedAt.toISOString(),
    })),
  });
}
