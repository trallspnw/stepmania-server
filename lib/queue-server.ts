import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeDifficultySlot } from "@/lib/library-browser";
import { insertIntoActiveQueueOrder } from "@/lib/queue-order";
import type { QueueChartRecord, QueueEntryRecord } from "@/lib/queue-types";
import { prisma } from "@/lib/prisma";

type QueueDbClient = Prisma.TransactionClient | PrismaClient;
type QueueStatus = "queued" | "playing";

type QueueChart = {
  id: number;
  gameMode: string;
  difficultySlot: string;
  meter: number;
};

type QueueUser = {
  id: number;
  displayName: string;
  isChild: boolean;
};

type QueueEntryWithRelations = {
  id: number;
  userId: number;
  songId: number;
  chartId: number;
  status: string;
  playOrder: number;
  createdAt: Date;
  user: QueueUser;
  song: {
    id: number;
    title: string;
    artist: string | null;
    filePath: string;
  };
  chart: QueueChart;
  joinedUser: QueueUser | null;
  joinedChart: QueueChart | null;
};

const QUEUE_USER_SELECT = {
  id: true,
  displayName: true,
  isChild: true,
} as const;

const QUEUE_CHART_SELECT = {
  id: true,
  gameMode: true,
  difficultySlot: true,
  meter: true,
} as const;

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

function mapQueueChart(chart: QueueChart): QueueChartRecord {
  return {
    id: chart.id,
    difficultySlot: normalizeDifficultySlot(chart.difficultySlot),
    meter: chart.meter,
  };
}

/**
 * Who may remove a player from the queue (the owner's entry or a join):
 * admins, the player themselves, and anyone for a child profile.
 */
function canManagePlayer(player: QueueUser, userId: number, isAdmin: boolean) {
  return isAdmin || player.id === userId || player.isChild;
}

function mapQueueEntry(entry: QueueEntryWithRelations, userId: number, isAdmin: boolean): QueueEntryRecord {
  const isQueued = entry.status !== "playing";
  const joinedUser = entry.joinedUser;
  const joinedChart = entry.joinedChart;
  const hasJoin = joinedUser !== null && joinedChart !== null;

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
    chart: mapQueueChart(entry.chart),
    joined: hasJoin
      ? {
          user: {
            id: joinedUser.id,
            displayName: joinedUser.displayName,
          },
          chart: mapQueueChart(joinedChart),
        }
      : null,
    canRemove: canManagePlayer(entry.user, userId, isAdmin),
    canJoin: isQueued && !hasJoin && entry.user.id !== userId,
    canLeave: isQueued && hasJoin && canManagePlayer(joinedUser, userId, isAdmin),
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
        select: QUEUE_USER_SELECT,
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
        select: QUEUE_CHART_SELECT,
      },
      joinedUser: {
        select: QUEUE_USER_SELECT,
      },
      joinedChart: {
        select: QUEUE_CHART_SELECT,
      },
    },
  });

  return sortQueueEntries(entries);
}

async function getCurrentQueueEntryInTx(tx: QueueDbClient): Promise<QueueEntryWithRelations | null> {
  const entries = await getQueueEntriesWithRelations(tx);
  return entries[0] ?? null;
}

export async function recomputeQueuedPlayOrder(
  tx: QueueDbClient,
  options?: { previousTurnUserId?: number | null },
) {
  const activeEntries = await tx.queueEntry.findMany({
    where: {
      status: {
        in: ["queued", "playing"],
      },
    },
    orderBy: [{ playOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      userId: true,
      createdAt: true,
      status: true,
    },
  });

  const playingEntry = activeEntries.find((entry) => entry.status === "playing") ?? null;
  const anchoredQueuedHead = playingEntry
    ? null
    : activeEntries.find((entry) => entry.status === "queued") ?? null;
  const queuedEntries = activeEntries.filter(
    (entry) => entry.status === "queued" && entry.id !== anchoredQueuedHead?.id,
  );

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

  const pivotUserId =
    playingEntry?.userId ?? anchoredQueuedHead?.userId ?? options?.previousTurnUserId ?? null;

  if (pivotUserId != null) {
    const pivotUserIndex = playerOrder.indexOf(pivotUserId);

    if (pivotUserIndex >= 0) {
      const rotatedPlayerOrder = [
        ...playerOrder.slice(pivotUserIndex + 1),
        ...playerOrder.slice(0, pivotUserIndex + 1),
      ];

      playerOrder.splice(0, playerOrder.length, ...rotatedPlayerOrder);
    }
  }

  const orderedIds: number[] = anchoredQueuedHead ? [anchoredQueuedHead.id] : [];
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

async function renumberQueueEntries(tx: QueueDbClient, orderedIds: number[]) {
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

    const activeEntries = await tx.queueEntry.findMany({
      where: {
        status: {
          in: ["queued", "playing"],
        },
      },
      orderBy: [{ playOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    const createdEntry = await tx.queueEntry.create({
      data: {
        userId: input.userId,
        songId: input.songId,
        chartId: input.chartId,
        status: "queued",
        playOrder: activeEntries.length + 1,
      },
    });

    const orderedIds = insertIntoActiveQueueOrder(
      activeEntries.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        status: entry.status === "playing" ? "playing" : "queued",
      })),
      {
        id: createdEntry.id,
        userId: createdEntry.userId,
      },
    ).map((entry) => entry.id);

    await renumberQueueEntries(tx, orderedIds);
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
        user: {
          select: {
            isChild: true,
          },
        },
      },
    });

    if (!entry) {
      throw new Error("Queue entry not found.");
    }

    const canRemove =
      input.requesterIsAdmin || entry.userId === input.requesterUserId || entry.user.isChild;

    if (!canRemove) {
      throw new Error("Forbidden");
    }

    await tx.queueEntry.delete({
      where: {
        id: entry.id,
      },
    });
  });
}

/**
 * Joins a player to another player's queued entry as P2, with their own chart
 * of the same song. Joins don't use a turn or change the queue order, and are
 * fixed once the cabinet starts the song.
 */
export async function joinQueueEntry(input: {
  entryId: number;
  joinerUserId: number;
  chartId: number;
}) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.queueEntry.findUnique({
      where: {
        id: input.entryId,
      },
      select: {
        id: true,
        userId: true,
        songId: true,
        status: true,
        joinedUserId: true,
      },
    });

    if (!entry) {
      throw new Error("Queue entry not found.");
    }

    if (entry.status !== "queued") {
      throw new Error("This song has already started.");
    }

    if (entry.userId === input.joinerUserId) {
      throw new Error("You can't join your own song.");
    }

    if (entry.joinedUserId !== null && entry.joinedUserId !== input.joinerUserId) {
      throw new Error("Someone has already joined this song.");
    }

    const chart = await tx.chart.findUnique({
      where: {
        id: input.chartId,
      },
      select: {
        songId: true,
      },
    });

    if (!chart || chart.songId !== entry.songId) {
      throw new Error("Chart does not belong to song.");
    }

    await tx.queueEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        joinedUserId: input.joinerUserId,
        joinedChartId: input.chartId,
        joinedAt: new Date(),
      },
    });
  });
}

export async function leaveQueueEntry(input: {
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
        status: true,
        joinedUser: {
          select: QUEUE_USER_SELECT,
        },
      },
    });

    if (!entry || !entry.joinedUser) {
      throw new Error("Queue entry not found.");
    }

    if (entry.status !== "queued") {
      throw new Error("This song has already started.");
    }

    if (!canManagePlayer(entry.joinedUser, input.requesterUserId, input.requesterIsAdmin)) {
      throw new Error("Forbidden");
    }

    await tx.queueEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        joinedUserId: null,
        joinedChartId: null,
        joinedAt: null,
      },
    });
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

type PlayableChart = {
  id: number;
  songId: number;
  gameMode: string;
  difficultySlot: string;
  meter: number;
};

/** The chart, if it belongs to the entry's song in the entry's game mode. */
async function findPlayableChart(
  tx: QueueDbClient,
  entry: QueueEntryWithRelations,
  chartId: number,
): Promise<PlayableChart | null> {
  const chart = await tx.chart.findUnique({
    where: {
      id: chartId,
    },
    select: {
      id: true,
      songId: true,
      gameMode: true,
      difficultySlot: true,
      meter: true,
    },
  });

  if (!chart || chart.songId !== entry.song.id || chart.gameMode !== entry.chart.gameMode) {
    return null;
  }

  return chart;
}

/**
 * Marks the current entry as playing. The players are fixed at this point:
 * side 2 stays joined, on `sideTwoChartId`, only if the cabinet started it;
 * otherwise the join is dropped. Repeat starts of a playing entry change nothing.
 */
export async function startCurrentQueueEntryWithExpectedIdAndDifficulty(input: {
  expectedQueueEntryId: number;
  chartId: number;
  sideTwoChartId: number | null;
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

    const playedChart = await findPlayableChart(tx, currentEntry, input.chartId);
    const sideTwoChart =
      input.sideTwoChartId === null ? null : await findPlayableChart(tx, currentEntry, input.sideTwoChartId);

    if (!playedChart || (input.sideTwoChartId !== null && !sideTwoChart)) {
      return {
        status: "invalid_chart" as const,
        current: currentEntry,
        chartId: input.chartId,
      };
    }

    if (currentEntry.status === "playing") {
      return {
        status: "started" as const,
        entry: currentEntry,
        playedChart,
      };
    }

    const startedSideTwoChart = currentEntry.joinedUser !== null ? sideTwoChart : null;

    await tx.queueEntry.update({
      where: {
        id: currentEntry.id,
      },
      data: {
        status: "playing" satisfies QueueStatus,
        ...(startedSideTwoChart
          ? { joinedChartId: startedSideTwoChart.id }
          : { joinedUserId: null, joinedChartId: null, joinedAt: null }),
      },
    });

    return {
      status: "started" as const,
      entry: {
        ...currentEntry,
        status: "playing",
        joinedUser: startedSideTwoChart ? currentEntry.joinedUser : null,
        joinedChart: startedSideTwoChart,
      },
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
    const nextEntry = await getCurrentQueueEntryInTx(tx);

    return {
      status: "consumed" as const,
      removed: currentEntry,
      next: nextEntry,
    };
  });
}

/**
 * Removes side 2 (the join) from the current entry for the cabinet, without
 * skipping the song. Only before the song starts: the players are fixed after.
 * Dropping when nobody is joined succeeds and changes nothing.
 */
export async function dropCurrentQueueEntryJoin(expectedQueueEntryId: number) {
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

    if (currentEntry.status === "playing") {
      return {
        status: "started" as const,
        current: currentEntry,
      };
    }

    const droppedUser = currentEntry.joinedUser;

    if (droppedUser) {
      await tx.queueEntry.update({
        where: {
          id: currentEntry.id,
        },
        data: {
          joinedUserId: null,
          joinedChartId: null,
          joinedAt: null,
        },
      });
    }

    return {
      status: "dropped" as const,
      entry: currentEntry,
      droppedUser,
    };
  });
}

export type SideResultInput = {
  side: 1 | 2;
  chartId: number;
  score: number;
  grade: string;
};

/**
 * Records one play per reported side, then removes the current entry. Side 1
 * is the entry's owner. Side 2 is the joiner, recorded only if the cabinet
 * started side 2; otherwise its result is skipped.
 */
export async function finishCurrentQueueEntry(input: {
  results: SideResultInput[];
  isTest?: boolean;
  expectedQueueEntryId: number;
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

    const recordedSides: { side: 1 | 2; user: QueueUser; playedChart: PlayableChart }[] = [];

    for (const result of input.results) {
      const playedChart = await findPlayableChart(tx, currentEntry, result.chartId);

      if (!playedChart) {
        return {
          status: "invalid_chart" as const,
          current: currentEntry,
          chartId: result.chartId,
        };
      }

      const user = result.side === 1 ? currentEntry.user : currentEntry.joinedUser;

      if (!user) {
        continue;
      }

      await tx.playHistory.create({
        data: {
          songId: currentEntry.song.id,
          chartId: playedChart.id,
          userId: user.id,
          score: result.score,
          grade: result.grade,
          isTest: input.isTest ?? false,
        },
      });

      recordedSides.push({ side: result.side, user, playedChart });
    }

    await tx.queueEntry.delete({
      where: {
        id: currentEntry.id,
      },
    });
    const nextEntry = await getCurrentQueueEntryInTx(tx);

    return {
      status: "finished" as const,
      removed: currentEntry,
      recordedSides,
      next: nextEntry,
    };
  });
}
