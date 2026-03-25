import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeDifficultySlot } from "@/lib/library-browser";
import type { QueueEntryRecord } from "@/lib/queue-types";
import { prisma } from "@/lib/prisma";

type QueueDbClient = Prisma.TransactionClient | PrismaClient;

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

export async function recomputeQueuedPlayOrder(tx: QueueDbClient) {
  const queuedEntries = await tx.queueEntry.findMany({
    where: {
      status: "queued",
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      userId: true,
      createdAt: true,
    },
  });

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
  const entries = await prisma.queueEntry.findMany({
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

  return sortQueueEntries(entries).map((entry) => ({
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
  }));
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
