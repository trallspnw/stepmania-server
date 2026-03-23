import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

export async function GET(
  request: Request,
  context: { params: Promise<{ packId: string }> },
) {
  const result = await getAdminSession();

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { packId: rawPackId } = await context.params;
  const packId = Number(rawPackId);

  if (!Number.isInteger(packId) || packId <= 0) {
    return NextResponse.json({ error: "Invalid pack id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    select: {
      id: true,
      folderName: true,
      titles: true,
    },
  });

  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const [total, songs] = await Promise.all([
    prisma.song.count({
      where: { packId },
    }),
    prisma.song.findMany({
      where: { packId },
      orderBy: [{ available: "desc" }, { title: "asc" }, { filePath: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: {
            charts: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    pack: {
      id: pack.id,
      folderName: pack.folderName,
      titles: pack.titles,
    },
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    songs: songs.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      simfileType: song.simfileType,
      bpmMin: song.bpmMin,
      bpmMax: song.bpmMax,
      available: song.available,
      ingestFlags: song.ingestFlags,
      chartCount: song._count.charts,
      updatedAt: song.updatedAt.toISOString(),
    })),
  });
}
