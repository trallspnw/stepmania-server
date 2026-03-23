import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
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

  const artists = await prisma.song.groupBy({
    by: ["artist"],
    where: {
      available: true,
      artist: {
        not: null,
      },
      charts: {
        some: {
          gameMode,
        },
      },
    },
    _count: {
      _all: true,
    },
    orderBy: {
      artist: "asc",
    },
  });

  const filteredArtists = artists.filter((artist) => artist.artist?.trim());
  const pagedArtists = filteredArtists.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total: filteredArtists.length,
    totalPages: Math.max(1, Math.ceil(filteredArtists.length / PAGE_SIZE)),
    gameMode,
    artists: pagedArtists.map((artist) => ({
      name: artist.artist ?? "",
      songCount: artist._count._all,
    })),
  });
}
