import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseSimfile } from "./parseSimfile";

export type SongIngestResult = {
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: { folder: string; error: string }[];
};

type DetailedSongIngestResult = SongIngestResult & {
  chartsCreated: number;
  chartsDeleted: number;
};

function parseOptionalFloat(rawValue: string | undefined) {
  if (!rawValue || !rawValue.trim()) {
    return { value: null, nonNumeric: false };
  }

  const parsed = Number.parseFloat(rawValue);
  if (Number.isNaN(parsed)) {
    return { value: null, nonNumeric: true };
  }

  return { value: parsed, nonNumeric: false };
}

function parseBpms(rawValue: string | undefined) {
  if (!rawValue || !rawValue.trim()) {
    return { bpmMin: null as number | null, bpmMax: null as number | null, segmentCount: 0 };
  }

  const values = rawValue
    .split(",")
    .map((segment) => segment.split("=")[1]?.trim())
    .map((value) => Number.parseFloat(value ?? ""))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return { bpmMin: null as number | null, bpmMax: null as number | null, segmentCount: 0 };
  }

  return {
    bpmMin: Math.min(...values),
    bpmMax: Math.max(...values),
    segmentCount: values.length,
  };
}

function normalizeDifficultySlot(slot: string) {
  const trimmed = slot.trim();
  return trimmed.replace(/^\w/, (character) => character.toUpperCase());
}

function chooseSimfile(songFolderPath: string) {
  const entries = fs.readdirSync(songFolderPath).sort((a, b) => a.localeCompare(b));
  const sscFiles = entries.filter((entry) => entry.toLowerCase().endsWith(".ssc"));
  const smFiles = entries.filter((entry) => entry.toLowerCase().endsWith(".sm"));
  const selected = sscFiles[0] ?? smFiles[0] ?? null;

  return {
    selectedPath: selected ? path.join(songFolderPath, selected) : null,
    hasSsc: sscFiles.length > 0,
    hasSm: smFiles.length > 0,
  };
}

async function yieldToEventLoop() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

export async function ingestSongs(
  songsDir: string,
  packId: number,
  packFolderName: string,
): Promise<SongIngestResult> {
  const result: DetailedSongIngestResult = {
    created: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
    errors: [],
    chartsCreated: 0,
    chartsDeleted: 0,
  };

  const packPath = path.resolve(songsDir, packFolderName);
  let songFolderNames: string[] = [];

  if (fs.existsSync(packPath)) {
    try {
      songFolderNames = fs
        .readdirSync(packPath)
        .filter((entry) => fs.statSync(path.join(packPath, entry)).isDirectory())
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      result.errors.push({
        folder: packFolderName,
        error: error instanceof Error ? error.message : "Unable to scan pack folder",
      });
      return result;
    }
  }

  const existingSongs = await prisma.song.findMany({
    where: { packId },
    select: {
      id: true,
      filePath: true,
      checksum: true,
      available: true,
    },
  });

  const existingByFilePath = new Map(existingSongs.map((song) => [song.filePath, song]));
  const seenFilePaths = new Set<string>();

  let processedCount = 0;
  for (const songFolderName of songFolderNames) {
    processedCount += 1;
    if (processedCount % 25 === 0) {
      await yieldToEventLoop();
    }

    const filePath = `${packFolderName}/${songFolderName}`;
    seenFilePaths.add(filePath);
    const songFolderPath = path.join(packPath, songFolderName);

    try {
      const simfile = chooseSimfile(songFolderPath);

      if (!simfile.selectedPath) {
        console.warn(`No simfile found for "${filePath}", skipping song folder.`);
        continue;
      }

      const rawBytes = fs.readFileSync(simfile.selectedPath);
      const checksum = crypto.createHash("md5").update(rawBytes).digest("hex");
      const parsed = parseSimfile(simfile.selectedPath);

      if (parsed.parseError) {
        result.errors.push({ folder: filePath, error: parsed.parseError });
        continue;
      }

      const bpms = parseBpms(parsed.tags.BPMS);
      const offset = parseOptionalFloat(parsed.tags.OFFSET);
      const sampleStart = parseOptionalFloat(parsed.tags.SAMPLESTART);
      const sampleLength = parseOptionalFloat(parsed.tags.SAMPLELENGTH);

      const ingestFlags = new Set<string>();
      if (!parsed.tags.ARTIST?.trim()) {
        ingestFlags.add("missing_artist");
      }
      if (parsed.encodingIssue) {
        ingestFlags.add("encoding_issue");
      }
      if (simfile.hasSsc && simfile.hasSm) {
        ingestFlags.add("both_simfiles");
      }
      if (sampleStart.nonNumeric || sampleLength.nonNumeric) {
        ingestFlags.add("non_numeric_sample");
      }
      if (parsed.tags.DISPLAYBPM?.trim() === "*" || bpms.segmentCount > 1) {
        ingestFlags.add("variable_bpm");
      }

      const chartKeys = new Set<string>();
      const chartRows: {
        gameMode: string;
        difficultySlot: string;
        meter: number;
        author: string | null;
        isPrimary: boolean;
      }[] = [];

      for (const chart of parsed.charts) {
        const gameMode = chart.gameMode.trim();
        const difficultySlot = normalizeDifficultySlot(chart.difficultySlot);

        if (!gameMode || !difficultySlot || !Number.isFinite(chart.meter)) {
          continue;
        }

        const chartKey = `${gameMode}::${difficultySlot}`;
        if (chartKeys.has(chartKey)) {
          ingestFlags.add("duplicate_chart");
          continue;
        }

        chartKeys.add(chartKey);
        chartRows.push({
          gameMode,
          difficultySlot,
          meter: chart.meter,
          author: chart.author?.trim() || null,
          isPrimary: gameMode === "dance-single",
        });
      }

      if (!chartRows.some((chart) => chart.gameMode === "dance-single")) {
        ingestFlags.add("no_dance_single");
      }

      const songData = {
        packId,
        title: parsed.tags.TITLE?.trim() || songFolderName,
        titleTranslit: parsed.tags.TITLETRANSLIT?.trim() || null,
        artist: parsed.tags.ARTIST?.trim() || null,
        artistTranslit: parsed.tags.ARTISTTRANSLIT?.trim() || null,
        genre: parsed.tags.GENRE?.trim() || null,
        credit: parsed.tags.CREDIT?.trim() || null,
        displayBpm: parsed.tags.DISPLAYBPM?.trim() || null,
        bpmMin: bpms.bpmMin,
        bpmMax: bpms.bpmMax,
        offset: offset.value,
        sampleStart: sampleStart.value,
        sampleLength: sampleLength.value,
        filePath,
        simfileType: parsed.simfileType,
        checksum,
        available: true,
        ingestFlags: ingestFlags.size > 0 ? [...ingestFlags].sort().join("|") : null,
        lastScanned: new Date(),
      };

      const existingSong = existingByFilePath.get(filePath);
      if (existingSong && existingSong.checksum === checksum && existingSong.available) {
        result.unchanged += 1;
        continue;
      }

      if (!existingSong) {
        const createdSong = await prisma.song.create({
          data: {
            ...songData,
            charts: {
              create: chartRows,
            },
          },
        });

        result.created += 1;
        result.chartsCreated += chartRows.length;
        existingByFilePath.set(filePath, {
          id: createdSong.id,
          filePath,
          checksum,
          available: true,
        });
        continue;
      }

      const chartMutation = await prisma.$transaction(async (tx) => {
        const deleted = await tx.chart.deleteMany({
          where: { songId: existingSong.id },
        });

        await tx.song.update({
          where: { id: existingSong.id },
          data: songData,
        });

        const created =
          chartRows.length > 0
            ? await tx.chart.createMany({
                data: chartRows.map((chart) => ({
                  songId: existingSong.id,
                  gameMode: chart.gameMode,
                  difficultySlot: chart.difficultySlot,
                  meter: chart.meter,
                  author: chart.author,
                  isPrimary: chart.isPrimary,
                })),
              })
            : { count: 0 };

        return { deleted: deleted.count, created: created.count };
      });

      result.updated += 1;
      result.chartsDeleted += chartMutation.deleted;
      result.chartsCreated += chartMutation.created;
      existingByFilePath.set(filePath, {
        id: existingSong.id,
        filePath,
        checksum,
        available: true,
      });
    } catch (error) {
      result.errors.push({
        folder: filePath,
        error: error instanceof Error ? error.message : "Unknown song ingestion error",
      });
    }
  }

  const missingSongs = existingSongs
    .filter((song) => !seenFilePaths.has(song.filePath) && song.available)
    .map((song) => song.filePath);

  if (missingSongs.length > 0) {
    const deactivated = await prisma.song.updateMany({
      where: {
        packId,
        filePath: { in: missingSongs },
        available: true,
      },
      data: {
        available: false,
        lastScanned: new Date(),
      },
    });
    result.deactivated += deactivated.count;
  }

  return result;
}
