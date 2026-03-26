import { normalizeDifficultySlot } from "@/lib/library-browser";
import { prisma } from "@/lib/prisma";

function toScoreNumber(score: { toNumber(): number } | null) {
  return score ? score.toNumber() : null;
}

export async function recordPlayHistory(input: {
  songId: number;
  chartId: number;
  userId: number;
  score: number;
  grade: string;
  isTest?: boolean;
}) {
  return prisma.playHistory.create({
    data: {
      songId: input.songId,
      chartId: input.chartId,
      userId: input.userId,
      score: input.score,
      grade: input.grade,
      isTest: input.isTest ?? false,
    },
  });
}

export async function getUserHighScore(input: {
  songId: number;
  chartId: number;
  userId: number;
}) {
  const record = await prisma.playHistory.findFirst({
    where: {
      songId: input.songId,
      chartId: input.chartId,
      userId: input.userId,
    },
    orderBy: [{ score: "desc" }, { playedAt: "asc" }],
    select: {
      score: true,
      grade: true,
    },
  });

  if (!record) {
    return null;
  }

  return {
    score: toScoreNumber(record.score),
    grade: record.grade,
  };
}

export async function getServerHighScore(input: {
  songId: number;
  chartId: number;
}) {
  const record = await prisma.playHistory.findFirst({
    where: {
      songId: input.songId,
      chartId: input.chartId,
    },
    orderBy: [{ score: "desc" }, { playedAt: "asc" }],
    select: {
      score: true,
      grade: true,
      user: {
        select: {
          displayName: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  return {
    score: toScoreNumber(record.score),
    grade: record.grade,
    held_by: record.user.displayName,
  };
}

export async function resolveSongChartByPath(input: {
  filePath: string;
  difficultyName: string | null | undefined;
}) {
  const song = await prisma.song.findUnique({
    where: {
      filePath: input.filePath,
    },
    select: {
      id: true,
      charts: {
        select: {
          id: true,
          difficultySlot: true,
          meter: true,
        },
        orderBy: [{ meter: "desc" }],
      },
    },
  });

  if (!song) {
    return null;
  }

  const targetDifficulty = input.difficultyName ? normalizeDifficultySlot(input.difficultyName) : null;
  const chart =
    song.charts.find((candidate) => normalizeDifficultySlot(candidate.difficultySlot) === targetDifficulty) ??
    null;

  if (!chart) {
    return null;
  }

  return {
    songId: song.id,
    chartId: chart.id,
    difficultyName: chart.difficultySlot,
  };
}

export async function getRecentPlayHistory(limit = 100) {
  const entries = await prisma.playHistory.findMany({
    orderBy: [{ playedAt: "desc" }, { id: "desc" }],
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
      song: {
        select: {
          id: true,
          title: true,
          artist: true,
        },
      },
      chart: {
        select: {
          id: true,
          difficultySlot: true,
          meter: true,
        },
      },
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    playedAt: entry.playedAt.toISOString(),
    score: toScoreNumber(entry.score),
    grade: entry.grade,
    isTest: entry.isTest,
    user: {
      id: entry.user.id,
      displayName: entry.user.displayName,
    },
    song: {
      id: entry.song.id,
      title: entry.song.title,
      artist: entry.song.artist?.trim() || "-",
    },
    chart: {
      id: entry.chart.id,
      difficultySlot: normalizeDifficultySlot(entry.chart.difficultySlot),
      meter: entry.chart.meter,
    },
  }));
}

export async function clearTestPlayHistory() {
  return prisma.playHistory.deleteMany({
    where: {
      isTest: true,
    },
  });
}
