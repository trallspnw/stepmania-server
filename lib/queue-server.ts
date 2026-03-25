import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeDifficultySlot } from "@/lib/library-browser";
import type { QueueEntryRecord } from "@/lib/queue-types";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/settingKeys";

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

async function upsertSettingInTx(
  tx: QueueDbClient,
  key: string,
  value: string | null,
) {
  await tx.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
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

async function syncCurrentSongSettingsToQueue(tx: QueueDbClient) {
  const currentEntry = await getCurrentQueueEntryInTx(tx);

  await upsertSettingInTx(
    tx,
    SETTING_KEYS.CURRENT_SONG_PATH,
    currentEntry?.song.filePath ?? null,
  );
  await upsertSettingInTx(
    tx,
    SETTING_KEYS.CURRENT_SONG_DIFFICULTY,
    currentEntry?.chart.difficultySlot ?? null,
  );
  await upsertSettingInTx(
    tx,
    SETTING_KEYS.CURRENT_PLAYER_ID,
    currentEntry ? String(currentEntry.user.id) : null,
  );

  return currentEntry;
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
    await syncCurrentSongSettingsToQueue(tx);
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
    await syncCurrentSongSettingsToQueue(tx);
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

    await syncCurrentSongSettingsToQueue(tx);
  });
}

export async function startCurrentQueueEntry() {
  return prisma.$transaction(async (tx) => {
    const currentEntry = await getCurrentQueueEntryInTx(tx);

    if (!currentEntry) {
      return null;
    }

    let nextCurrentEntry = currentEntry;

    if (currentEntry.status !== "playing") {
      await tx.queueEntry.update({
        where: {
          id: currentEntry.id,
        },
        data: {
          status: "playing" satisfies QueueStatus,
        },
      });

      nextCurrentEntry = {
        ...currentEntry,
        status: "playing",
      };
    }

    await upsertSettingInTx(tx, SETTING_KEYS.CURRENT_SONG_PATH, nextCurrentEntry.song.filePath);
    await upsertSettingInTx(
      tx,
      SETTING_KEYS.CURRENT_SONG_DIFFICULTY,
      nextCurrentEntry.chart.difficultySlot,
    );
    await upsertSettingInTx(tx, SETTING_KEYS.CURRENT_PLAYER_ID, String(nextCurrentEntry.user.id));

    return nextCurrentEntry;
  });
}

export async function consumeCurrentQueueEntry() {
  return prisma.$transaction(async (tx) => {
    const currentEntry = await getCurrentQueueEntryInTx(tx);

    if (!currentEntry) {
      return null;
    }

    await tx.queueEntry.delete({
      where: {
        id: currentEntry.id,
      },
    });

    await recomputeQueuedPlayOrder(tx);
    const nextEntry = await syncCurrentSongSettingsToQueue(tx);

    return {
      removed: currentEntry,
      next: nextEntry,
    };
  });
}
