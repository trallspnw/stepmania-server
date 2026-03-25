import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import {
  formatBpmLabel,
  getDisplayTitleFromTitles,
  normalizeDifficultySlot,
} from "@/lib/library-browser";
import { normalizeLibraryGameMode } from "@/lib/library-mode";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

const PAGE_SIZE = 50;
const MAX_BROWSE_BPM_BOUND = 1000;
const DIFFICULTY_ORDER: Record<string, number> = {
  Beginner: 0,
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Expert: 4,
  Custom: 5,
};

function getPage(request: Request) {
  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get("page") ?? "1");

  return Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.floor(requestedPage)
    : 1;
}

function getNumberParam(searchParams: URLSearchParams, key: string, fallback: number) {
  const value = Number(searchParams.get(key) ?? String(fallback));
  return Number.isFinite(value) ? value : fallback;
}

function getOptionalNumberParam(searchParams: URLSearchParams, key: string) {
  const rawValue = searchParams.get(key);

  if (rawValue == null || rawValue.trim() === "") {
    return null;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
  const result = await getSessionUserRecord();

  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = getPage(request);
  const gameMode = normalizeLibraryGameMode(await getSetting(SETTING_KEYS.LIBRARY_GAME_MODE));
  const query = url.searchParams.get("query")?.trim() ?? "";
  const artist = url.searchParams.get("artist")?.trim() ?? "";
  const packId = Number(url.searchParams.get("packId") ?? "");
  const minDifficulty = getOptionalNumberParam(url.searchParams, "minDifficulty");
  const maxDifficulty = getOptionalNumberParam(url.searchParams, "maxDifficulty");
  const minBpm = getOptionalNumberParam(url.searchParams, "minBpm");
  const maxBpm = getOptionalNumberParam(url.searchParams, "maxBpm");
  const normalizedMinDifficulty =
    minDifficulty != null && maxDifficulty != null ? Math.min(minDifficulty, maxDifficulty) : minDifficulty;
  const normalizedMaxDifficulty =
    minDifficulty != null && maxDifficulty != null ? Math.max(minDifficulty, maxDifficulty) : maxDifficulty;
  const normalizedMinBpm =
    minBpm != null && maxBpm != null ? Math.min(minBpm, maxBpm) : minBpm;
  const normalizedMaxBpm =
    minBpm != null && maxBpm != null ? Math.max(minBpm, maxBpm) : maxBpm;

  const baseWhere = {
    available: true,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { artist: { contains: query, mode: "insensitive" as const } },
            { pack: { folderName: { contains: query, mode: "insensitive" as const } } },
            { pack: { titles: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(artist
      ? {
          artist: {
            equals: artist,
          },
        }
      : {}),
    ...(Number.isInteger(packId) && packId > 0
      ? {
          packId,
        }
      : {}),
    charts: {
      some: {
        gameMode,
      },
    },
  };

  const where = {
    ...baseWhere,
    charts: {
      some: {
        gameMode,
        ...((normalizedMinDifficulty != null || normalizedMaxDifficulty != null)
          ? {
              meter: {
                ...(normalizedMinDifficulty != null ? { gte: normalizedMinDifficulty } : {}),
                ...(normalizedMaxDifficulty != null ? { lte: normalizedMaxDifficulty } : {}),
              },
            }
          : {}),
      },
    },
    ...((normalizedMinBpm != null || normalizedMaxBpm != null)
      ? {
          AND: [
            {
              bpmMin: {
                not: null,
              },
            },
            {
              bpmMax: {
                not: null,
              },
            },
            ...(normalizedMaxBpm != null
              ? [
                  {
                    bpmMin: {
                      lte: normalizedMaxBpm,
                    },
                  },
                ]
              : []),
            ...(normalizedMinBpm != null
              ? [
                  {
                    bpmMax: {
                      gte: normalizedMinBpm,
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  };

  const [total, songs, songBpmBounds, chartDifficultyBounds] = await Promise.all([
    prisma.song.count({ where }),
    prisma.song.findMany({
      where,
      orderBy: [{ title: "asc" }, { filePath: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
            ...((normalizedMinDifficulty != null || normalizedMaxDifficulty != null)
              ? {
                  meter: {
                    ...(normalizedMinDifficulty != null ? { gte: normalizedMinDifficulty } : {}),
                    ...(normalizedMaxDifficulty != null ? { lte: normalizedMaxDifficulty } : {}),
                  },
                }
              : {}),
          },
          orderBy: [{ meter: "asc" }, { difficultySlot: "asc" }],
          select: {
            difficultySlot: true,
            meter: true,
          },
        },
      },
    }),
    prisma.song.aggregate({
      where: {
        ...baseWhere,
        bpmMin: {
          not: null,
        },
        bpmMax: {
          not: null,
        },
      },
      _min: {
        bpmMin: true,
      },
      _max: {
        bpmMax: true,
      },
    }),
    prisma.chart.aggregate({
      where: {
        gameMode,
        song: baseWhere,
      },
      _min: {
        meter: true,
      },
      _max: {
        meter: true,
      },
    }),
  ]);

  const filterBounds = {
    minDifficulty: chartDifficultyBounds._min.meter ?? 1,
    maxDifficulty: chartDifficultyBounds._max.meter ?? 25,
    minBpm: Math.floor(songBpmBounds._min.bpmMin ?? 100),
    maxBpm: Math.min(MAX_BROWSE_BPM_BOUND, Math.ceil(songBpmBounds._max.bpmMax ?? 450)),
  };

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    gameMode,
    filterBounds,
    songs: songs.map((song) => {
      const normalizedCharts = new Map<string, number>();

      for (const chart of song.charts) {
        const slot = normalizeDifficultySlot(chart.difficultySlot);
        const currentMeter = normalizedCharts.get(slot);

        if (currentMeter == null || chart.meter > currentMeter) {
          normalizedCharts.set(slot, chart.meter);
        }
      }

      return {
        id: String(song.id),
        title: song.title,
        artist: song.artist?.trim() || "-",
        packId: song.pack.id,
        pack: getDisplayTitleFromTitles(song.pack.titles) || song.pack.folderName,
        bpmLabel: formatBpmLabel(song.displayBpm, song.bpmMin, song.bpmMax),
        bpmFilterMin: song.bpmMin,
        bpmFilterMax: song.bpmMax,
        difficulties: [...normalizedCharts.entries()]
          .map(([slot, level]) => ({
            slot: normalizeDifficultySlot(slot),
            level,
          }))
          .sort(
            (left, right) =>
              (DIFFICULTY_ORDER[left.slot] ?? Number.MAX_SAFE_INTEGER) -
              (DIFFICULTY_ORDER[right.slot] ?? Number.MAX_SAFE_INTEGER),
          ),
      };
    }),
  });
}
