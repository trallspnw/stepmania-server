import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { ingestPacks, type PackIngestResult } from "@/lib/ingestion/ingestPacks";
import { ingestSongs, type SongIngestResult } from "@/lib/ingestion/ingestSongs";

export type IngestionStageStatus = "idle" | "running" | "completed" | "failed" | "pending";
export type IngestionJobStatus = "idle" | "running" | "completed" | "failed";

export type LibrarySongIngestSummary = {
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: { folder: string; error: string }[];
};

export type ChartIngestResult = {
  created: number;
  deleted: number;
};

export type IngestionStatus = {
  runId: number | null;
  status: IngestionJobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  packs: {
    status: IngestionStageStatus;
    result: PackIngestResult | null;
    error: string | null;
  };
  songs: {
    status: IngestionStageStatus;
    result: LibrarySongIngestSummary | null;
    error: string | null;
  };
  charts: {
    status: IngestionStageStatus;
    result: ChartIngestResult | null;
    error: string | null;
  };
};

declare global {
  var __stepmaniaIngestionStatus: IngestionStatus | undefined;
  var __stepmaniaIngestionNextRunId: number | undefined;
}

function createInitialStatus(): IngestionStatus {
  return {
    runId: null,
    status: "idle",
    startedAt: null,
    finishedAt: null,
    packs: {
      status: "idle",
      result: null,
      error: null,
    },
    songs: {
      status: "idle",
      result: null,
      error: null,
    },
    charts: {
      status: "idle",
      result: null,
      error: null,
    },
  };
}

function getMutableStatusStore() {
  if (!global.__stepmaniaIngestionStatus) {
    global.__stepmaniaIngestionStatus = createInitialStatus();
  }

  if (!global.__stepmaniaIngestionNextRunId) {
    global.__stepmaniaIngestionNextRunId = 1;
  }

  return global;
}

function getNextRunId() {
  const store = getMutableStatusStore();
  const runId = store.__stepmaniaIngestionNextRunId ?? 1;
  store.__stepmaniaIngestionNextRunId = runId + 1;
  return runId;
}

function setStatus(next: IngestionStatus) {
  getMutableStatusStore().__stepmaniaIngestionStatus = next;
}

export function getIngestionStatus(): IngestionStatus {
  return getMutableStatusStore().__stepmaniaIngestionStatus ?? createInitialStatus();
}

function createSongSummary(): LibrarySongIngestSummary {
  return {
    created: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
    errors: [],
  };
}

async function runIngestion(runId: number, songsDir: string) {
  try {
    setStatus({
      ...getIngestionStatus(),
      runId,
      status: "running",
      packs: {
        status: "running",
        result: null,
        error: null,
      },
      songs: {
        status: "idle",
        result: null,
        error: null,
      },
      charts: {
        status: "idle",
        result: null,
        error: null,
      },
    });

    const packResult = await ingestPacks(songsDir);
    setStatus({
      ...getIngestionStatus(),
      runId,
      packs: {
        status: "completed",
        result: packResult,
        error: null,
      },
      songs: {
        status: "running",
        result: createSongSummary(),
        error: null,
      },
      charts: {
        status: "running",
        result: {
          created: 0,
          deleted: 0,
        },
        error: null,
      },
    });

    const packs = await prisma.pack.findMany({
      orderBy: [{ sortIndex: "asc" }, { folderName: "asc" }],
      select: {
        id: true,
        folderName: true,
      },
    });

    const aggregateSongs = createSongSummary();
    const aggregateCharts: ChartIngestResult = {
      created: 0,
      deleted: 0,
    };

    for (const pack of packs) {
      const songResult = (await ingestSongs(
        songsDir,
        pack.id,
        pack.folderName,
      )) as SongIngestResult & { chartsCreated?: number; chartsDeleted?: number };

      aggregateSongs.created += songResult.created;
      aggregateSongs.updated += songResult.updated;
      aggregateSongs.deactivated += songResult.deactivated;
      aggregateSongs.unchanged += songResult.unchanged;
      aggregateSongs.errors.push(...songResult.errors);
      aggregateCharts.created += songResult.chartsCreated ?? 0;
      aggregateCharts.deleted += songResult.chartsDeleted ?? 0;

      setStatus({
        ...getIngestionStatus(),
        runId,
        songs: {
          status: "running",
          result: { ...aggregateSongs, errors: [...aggregateSongs.errors] },
          error: null,
        },
        charts: {
          status: "running",
          result: { ...aggregateCharts },
          error: null,
        },
      });
    }

    setStatus({
      ...getIngestionStatus(),
      runId,
      status: "completed",
      finishedAt: new Date().toISOString(),
      packs: {
        ...getIngestionStatus().packs,
        error: null,
      },
      songs: {
        status: "completed",
        result: { ...aggregateSongs, errors: [...aggregateSongs.errors] },
        error: null,
      },
      charts: {
        status: "completed",
        result: { ...aggregateCharts },
        error: null,
      },
    });
  } catch (error) {
    setStatus({
      ...getIngestionStatus(),
      runId,
      status: "failed",
      finishedAt: new Date().toISOString(),
      packs: {
        ...getIngestionStatus().packs,
        status: getIngestionStatus().packs.status === "completed" ? "completed" : "failed",
        error: error instanceof Error ? error.message : "Pack ingestion failed",
      },
      songs: {
        ...getIngestionStatus().songs,
        status: getIngestionStatus().songs.status === "completed" ? "completed" : "failed",
        error: error instanceof Error ? error.message : "Song ingestion failed",
      },
      charts: {
        ...getIngestionStatus().charts,
        status: getIngestionStatus().charts.status === "completed" ? "completed" : "failed",
        error: error instanceof Error ? error.message : "Chart ingestion failed",
      },
    });
  }
}

export function startIngestion(songsDir: string) {
  const current = getIngestionStatus();

  if (current.status === "running") {
    return {
      started: false,
      status: current,
    };
  }

  const runId = getNextRunId();
  const startedAt = new Date().toISOString();
  const nextStatus: IngestionStatus = {
    runId,
    status: "running",
    startedAt,
    finishedAt: null,
    packs: {
      status: "idle",
      result: null,
      error: null,
    },
    songs: {
      status: "idle",
      result: null,
      error: null,
    },
    charts: {
      status: "idle",
      result: null,
      error: null,
    },
  };

  setStatus(nextStatus);
  void runIngestion(runId, songsDir);

  return {
    started: true,
    status: nextStatus,
  };
}
