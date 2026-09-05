import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { formatBpmLabel, getDisplayTitleFromTitles, normalizeDifficultySlot } from "@/lib/library-browser";
import { normalizeLibraryGameMode } from "@/lib/library-mode";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

const DIFFICULTY_ORDER: Record<string, number> = {
  Beginner: 0,
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Expert: 4,
  Custom: 5,
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ songId: string }> },
) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { songId: rawSongId } = await context.params;
  const songId = Number(rawSongId);

  if (!Number.isInteger(songId) || songId <= 0) {
    return NextResponse.json({ error: "Invalid song id" }, { status: 400 });
  }

  const gameMode = normalizeLibraryGameMode(await getSetting(SETTING_KEYS.LIBRARY_GAME_MODE));

  const song = await prisma.song.findFirst({
    where: {
      id: songId,
      available: true,
    },
    include: {
      pack: {
        select: {
          id: true,
          folderName: true,
          titles: true,
        },
      },
      charts: {
        where: {
          gameMode,
        },
        orderBy: [{ meter: "asc" }, { difficultySlot: "asc" }],
        select: {
          id: true,
          difficultySlot: true,
          meter: true,
        },
      },
    },
  });

  if (!song || song.charts.length === 0) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const normalizedCharts = new Map<string, { chartId: number; meter: number }>();

  for (const chart of song.charts) {
    const slot = normalizeDifficultySlot(chart.difficultySlot);
    const currentChart = normalizedCharts.get(slot);

    if (currentChart == null || chart.meter > currentChart.meter) {
      normalizedCharts.set(slot, { chartId: chart.id, meter: chart.meter });
    }
  }

  return NextResponse.json({
    song: {
      id: String(song.id),
      title: song.title,
      artist: song.artist?.trim() || "-",
      packId: song.pack.id,
      pack: getDisplayTitleFromTitles(song.pack.titles) || song.pack.folderName,
      bpmLabel: formatBpmLabel(song.displayBpm, song.bpmMin, song.bpmMax),
      bpmFilterMin: song.bpmMin,
      bpmFilterMax: song.bpmMax,
      sampleStart: song.sampleStart,
      sampleLength: song.sampleLength,
      difficulties: [...normalizedCharts.entries()]
        .map(([slot, chart]) => ({
          chartId: chart.chartId,
          slot: normalizeDifficultySlot(slot),
          level: chart.meter,
        }))
        .sort(
          (left, right) =>
            (DIFFICULTY_ORDER[left.slot] ?? Number.MAX_SAFE_INTEGER) -
            (DIFFICULTY_ORDER[right.slot] ?? Number.MAX_SAFE_INTEGER),
        ),
    },
  });
}
