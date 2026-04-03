import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeDifficultySlot } from "@/lib/library-browser";
import type { QueueEntryRecord } from "@/lib/queue-types";
import { prisma } from "@/lib/prisma";

type QueueDbClient = Prisma.TransactionClient | PrismaClient;
type QueueStatus = "queued" | "playing";

type QueueEntryWithRelations = {
  id: number;
  userId: number;
  songId: number;
  chartId: number;
  status: string;
  playOrder: number;
  createdAt: Date;
  user: {
    id: number;
    displayName: string;
  };
  song: {
    id: number;
    title: string;
    artist: string | null;
    filePath: string;
  };
  chart: {
    id: number;
    difficultySlot: string;
    meter: number;
  };
};

function sortQueueEntries<T extends { status: string; playOrder: number; createdAt: Date; id: number }>(
  entries: T[],
) {
  return [...entries].sort((left, right) => {
    const leftRank = left.status === "playing" ? 0 : 1;
    const rightRank = right.status === "playing" ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (left.playOrder !== right.playOrder) {
      return left.playOrder - right.playOrder;
    }

    if (left.createdAt.getTime() !== right.createdAt.getTime()) {
      return left.createdAt.getTime() - right.createdAt.getTime();
    }

    return left.id - right.id;
  });
}

function mapQueueEntry(entry: QueueEntryWithRelations, userId: number, isAdmin: boolean): QueueEntryRecord {
  return {
    id: entry.id,
    status: entry.status === "playing" ? "playing" : "queued",
    playOrder: entry.playOrder,
    createdAt: entry.createdAt.toISOString(),
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
    canRemove: isAdmin || entry.user.id === userId,
  };
}

async function getQueueEntriesWithRelations(tx: QueueDbClient): Promise<QueueEntryWithRelations[]> {
  const entries = await tx.queueEntry.findMany({
    where: {
      status: {
        in: ["queued", "playing"],
      },
    },
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
          filePath: true,
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

  return sortQueueEntries(entries);
}

async function getCurrentQueueEntryInTx(tx: QueueDbClient): Promise<QueueEntryWithRelations | null> {
  const entries = await getQueueEntriesWithRelations(tx);
  return entries[0] ?? null;
}

export async function recomputeQueuedPlayOrder(tx: QueueDbClient) {
  const [queuedEntries, playingEntry] = await Promise.all([
    tx.queueEntry.findMany({
      where: {
        status: "queued",
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        createdAt: true,
      },
    }),
    tx.queueEntry.findFirst({
      where: {
        status: "playing",
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      select: {
        userId: true,
      },
    }),
  ]);

  const playerOrder: number[] = [];
  const groupedEntries = new Map<
    number,
    {
      id: number;
      createdAt: Date;
    }[]
  >();

  for (const entry of queuedEntries) {
    const currentQueue = groupedEntries.get(entry.userId);

    if (!currentQueue) {
      groupedEntries.set(entry.userId, [{ id: entry.id, createdAt: entry.createdAt }]);
      playerOrder.push(entry.userId);
      continue;
    }

    currentQueue.push({ id: entry.id, createdAt: entry.createdAt });
  }

  if (playingEntry) {
    const playingUserIndex = playerOrder.indexOf(playingEntry.userId);

    if (playingUserIndex >= 0) {
      const rotatedPlayerOrder = [
        ...playerOrder.slice(playingUserIndex + 1),
        ...playerOrder.slice(0, playingUserIndex + 1),
      ];

      playerOrder.splice(0, playerOrder.length, ...rotatedPlayerOrder);
    }
  }

  const orderedIds: number[] = [];
  let progressed = true;

  while (progressed) {
    progressed = false;

    for (const userId of playerOrder) {
      const queue = groupedEntries.get(userId);
      const nextEntry = queue?.shift();

      if (!nextEntry) {
        continue;
      }

      orderedIds.push(nextEntry.id);
      progressed = true;
    }
  }

  await Promise.all(
    orderedIds.map((id, index) =>
      tx.queueEntry.update({
        where: { id },
        data: {
          playOrder: index + 1,
        },
      }),
    ),
  );
}

export async function getQueueEntriesForUser(userId: number, isAdmin: boolean): Promise<QueueEntryRecord[]> {
  const entries = await getQueueEntriesWithRelations(prisma);
  return entries.map((entry) => mapQueueEntry(entry, userId, isAdmin));
}

export async function getCurrentQueueEntry() {
  return getCurrentQueueEntryInTx(prisma);
}

export async function addQueueEntry(input: {
  userId: number;
  songId: number;
  chartId: number;
}) {
  await prisma.$transaction(async (tx) => {
    const chart = await tx.chart.findUnique({
      where: {
        id: input.chartId,
      },
      select: {
        id: true,
        songId: true,
      },
    });

    if (!chart || chart.songId !== input.songId) {
      throw new Error("Chart does not belong to song.");
    }

    await tx.queueEntry.create({
      data: {
        userId: input.userId,
        songId: input.songId,
        chartId: input.chartId,
        status: "queued",
        playOrder: 0,
      },
    });

    await recomputeQueuedPlayOrder(tx);
  });
}

export async function removeQueueEntry(input: {
  entryId: number;
  requesterUserId: number;
  requesterIsAdmin: boolean;
}) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.queueEntry.findUnique({
      where: {
        id: input.entryId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!entry) {
      throw new Error("Queue entry not found.");
    }

    if (!input.requesterIsAdmin && entry.userId !== input.requesterUserId) {
      throw new Error("Forbidden");
    }

    await tx.queueEntry.delete({
      where: {
        id: entry.id,
      },
    });

    await recomputeQueuedPlayOrder(tx);
  });
}

export async function clearQueueEntries() {
  await prisma.$transaction(async (tx) => {
    await tx.queueEntry.deleteMany({
      where: {
        status: {
          in: ["queued", "playing"],
        },
      },
    });
  });
}

export async function startCurrentQueueEntryWithExpectedId(expectedQueueEntryId: number) {
  return prisma.$transaction(async (tx) => {
    const currentEntry = await getCurrentQueueEntryInTx(tx);

    if (!currentEntry) {
      return {
        status: "missing" as const,
      };
    }

    if (currentEntry.id !== expectedQueueEntryId) {
      return {
        status: "mismatch" as const,
        current: currentEntry,
      };
    }

    return {
      status: "started" as const,
      entry: currentEntry,
    };
  });
}

export async function startCurrentQueueEntryWithExpectedIdAndDifficulty(input: {
  expectedQueueEntryId: number;
  difficultyName: string;
}) {
  return prisma.$transaction(async (tx) => {
    const currentEntry = await getCurrentQueueEntryInTx(tx);

    if (!currentEntry) {
      return {
        status: "missing" as const,
      };
    }

    if (currentEntry.id !== input.expectedQueueEntryId) {
      return {
        status: "mismatch" as const,
        current: currentEntry,
      };
    }

    const targetDifficulty = normalizeDifficultySlot(input.difficultyName);
    const availableCharts = await tx.chart.findMany({
      where: {
        songId: currentEntry.song.id,
      },
      select: {
        id: true,
        difficultySlot: true,
        meter: true,
      },
      orderBy: [{ meter: "desc" }],
    });
    const playedChart =
      availableCharts.find(
        (candidate) => normalizeDifficultySlot(candidate.difficultySlot) === targetDifficulty,
      ) ?? null;

    if (!playedChart) {
      return {
        status: "invalid_difficulty" as const,
        current: currentEntry,
        normalizedDifficultyName: targetDifficulty,
      };
    }

    if (currentEntry.status !== "playing") {
      await tx.queueEntry.update({
        where: {
          id: currentEntry.id,
        },
        data: {
          status: "playing" satisfies QueueStatus,
        },
      });

      return {
        status: "started" as const,
        entry: {
          ...currentEntry,
          status: "playing",
        },
        playedChart,
      };
    }

    return {
      status: "started" as const,
      entry: currentEntry,
      playedChart,
    };
  });
}

export async function consumeCurrentQueueEntryWithExpectedId(expectedQueueEntryId: number) {
  return prisma.$transaction(async (tx) => {
    const currentEntry = await getCurrentQueueEntryInTx(tx);

    if (!currentEntry) {
      return {
        status: "missing" as const,
      };
    }

    if (currentEntry.id !== expectedQueueEntryId) {
      return {
        status: "mismatch" as const,
        current: currentEntry,
      };
    }

    await tx.queueEntry.delete({
      where: {
        id: currentEntry.id,
      },
    });

    await recomputeQueuedPlayOrder(tx);
    const nextEntry = await getCurrentQueueEntryInTx(tx);

    return {
      status: "consumed" as const,
      removed: currentEntry,
      next: nextEntry,
    };
  });
}

export async function finishCurrentQueueEntry(input: {
  score: number;
  grade: string;
  isTest?: boolean;
  expectedQueueEntryId: number;
  difficultyName: string;
}) {
  return prisma.$transaction(async (tx) => {
    const currentEntry = await getCurrentQueueEntryInTx(tx);

    if (!currentEntry) {
      return {
        status: "missing" as const,
      };
    }

    if (currentEntry.id !== input.expectedQueueEntryId) {
      return {
        status: "mismatch" as const,
        current: currentEntry,
      };
    }

    const targetDifficulty = normalizeDifficultySlot(input.difficultyName);
    const availableCharts = await tx.chart.findMany({
      where: {
        songId: currentEntry.song.id,
      },
      select: {
        id: true,
        difficultySlot: true,
        meter: true,
      },
      orderBy: [{ meter: "desc" }],
    });
    const playedChart =
      availableCharts.find(
        (candidate) => normalizeDifficultySlot(candidate.difficultySlot) === targetDifficulty,
      ) ?? null;

    if (!playedChart) {
      return {
        status: "invalid_difficulty" as const,
        current: currentEntry,
        normalizedDifficultyName: targetDifficulty,
      };
    }

    await tx.playHistory.create({
      data: {
        songId: currentEntry.song.id,
        chartId: playedChart.id,
        userId: currentEntry.user.id,
        score: input.score,
        grade: input.grade,
        isTest: input.isTest ?? false,
      },
    });

    await tx.queueEntry.delete({
      where: {
        id: currentEntry.id,
      },
    });

    await recomputeQueuedPlayOrder(tx);
    const nextEntry = await getCurrentQueueEntryInTx(tx);

    return {
      status: "finished" as const,
      removed: currentEntry,
      playedChart,
      next: nextEntry,
    };
  });
}
