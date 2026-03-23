import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import {
  getDisplayTitleFromTitles,
  splitPipeField,
} from "@/lib/library-browser";
import { normalizeLibraryGameMode } from "@/lib/library-mode";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

const PAGE_SIZE = 50;

function getPage(request: Request) {
  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get("page") ?? "1");

  return Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.floor(requestedPage)
    : 1;
}

export async function GET(request: Request) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = getPage(request);
  const gameMode = normalizeLibraryGameMode(await getSetting(SETTING_KEYS.LIBRARY_GAME_MODE));

  const [total, packs] = await Promise.all([
    prisma.pack.count(),
    prisma.pack.findMany({
      orderBy: [{ sortIndex: "asc" }, { folderName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const songCounts = await Promise.all(
    packs.map((pack) =>
      prisma.song.count({
        where: {
          packId: pack.id,
          available: true,
          charts: {
            some: {
              gameMode,
            },
          },
        },
      }),
    ),
  );

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    gameMode,
    packs: packs.map((pack, index) => ({
      id: pack.id,
      folderName: pack.folderName,
      title: getDisplayTitleFromTitles(pack.titles) || pack.folderName,
      songCount: songCounts[index] ?? 0,
      platforms: splitPipeField(pack.platforms),
      regions: splitPipeField(pack.regions),
      earliestRelease: pack.earliestRelease,
    })),
  });
}
