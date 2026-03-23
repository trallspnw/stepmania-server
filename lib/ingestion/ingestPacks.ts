import fs from "node:fs";
import path from "node:path";
import { Pack } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PackIngestResult = {
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: { folder: string; error: string }[];
};

type ParsedPackIni = {
  titles: string | null;
  platforms: string | null;
  regions: string | null;
  earliestRelease: string | null;
  source: string | null;
};

function parsePackIni(filePath: string): ParsedPackIni | null {
  let contents: string;

  try {
    contents = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Unable to read pack.ini at "${filePath}": ${(error as Error).message}`);
    }
    return null;
  }

  const parsed: ParsedPackIni = {
    titles: null,
    platforms: null,
    regions: null,
    earliestRelease: null,
    source: null,
  };

  let sawPackSection = false;

  try {
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith(";")) {
        continue;
      }

      if (line.startsWith("[") && line.endsWith("]")) {
        sawPackSection = line === "[Pack]";
        continue;
      }

      if (!sawPackSection) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue || null;

      switch (key) {
        case "Titles":
          parsed.titles = value;
          break;
        case "Platforms":
          parsed.platforms = value;
          break;
        case "Regions":
          parsed.regions = value;
          break;
        case "EarliestRelease":
          parsed.earliestRelease = value
            ? value
                .split(";")[0]
                .trim()
                .replace(/\s+$/, "") || null
            : null;
          break;
        case "Source":
          parsed.source = value;
          break;
        default:
          break;
      }
    }
  } catch (error) {
    console.warn(`Malformed pack.ini at "${filePath}": ${(error as Error).message}`);
    return null;
  }

  if (!sawPackSection) {
    console.warn(`Missing [Pack] section in "${filePath}"`);
    return null;
  }

  return parsed;
}

function deriveSortIndex(folderName: string): string | null {
  const match = folderName.match(/^(\d+[A-Za-z]+)/);
  if (match) {
    return match[1];
  }

  const digitMatch = folderName.match(/^(\d+)/);
  return digitMatch?.[1] ?? null;
}

function buildPackData(folderName: string, metadata: ParsedPackIni | null) {
  const titles = metadata?.titles?.trim() || folderName;

  return {
    folderName,
    sortIndex: deriveSortIndex(folderName),
    titles,
    platforms: metadata?.platforms ?? null,
    regions: metadata?.regions ?? null,
    earliestRelease: metadata?.earliestRelease ?? null,
    source: metadata?.source ?? null,
    isCustom: folderName.startsWith("9"),
    isCommunity: folderName.startsWith("8"),
  };
}

function hasPackChanged(existing: Pack, next: ReturnType<typeof buildPackData>) {
  return (
    existing.sortIndex !== next.sortIndex ||
    existing.titles !== next.titles ||
    existing.platforms !== next.platforms ||
    existing.regions !== next.regions ||
    existing.earliestRelease !== next.earliestRelease ||
    existing.source !== next.source ||
    existing.isCustom !== next.isCustom ||
    existing.isCommunity !== next.isCommunity
  );
}

export async function ingestPacks(songsDir: string): Promise<PackIngestResult> {
  const result: PackIngestResult = {
    created: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
    errors: [],
  };

  const resolvedSongsDir = path.resolve(songsDir);

  let folderNames: string[] = [];

  try {
    const entries = fs.readdirSync(resolvedSongsDir);
    folderNames = entries
      .filter((entry) => fs.statSync(path.join(resolvedSongsDir, entry)).isDirectory())
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    throw new Error(`Unable to scan songs directory "${resolvedSongsDir}": ${(error as Error).message}`);
  }

  const existingPacks = await prisma.pack.findMany();
  const existingByFolder = new Map(existingPacks.map((pack) => [pack.folderName, pack]));

  for (const folderName of folderNames) {
    try {
      const packIniPath = path.join(resolvedSongsDir, folderName, "pack.ini");
      const metadata = parsePackIni(packIniPath);

      if (!metadata) {
        console.warn(`Pack metadata missing or unreadable for "${folderName}", ingesting folder only.`);
      }

      const packData = buildPackData(folderName, metadata);
      const existing = existingByFolder.get(folderName);

      if (!existing) {
        await prisma.pack.create({ data: packData });
        result.created += 1;
        continue;
      }

      if (!hasPackChanged(existing, packData)) {
        result.unchanged += 1;
        continue;
      }

      await prisma.pack.update({
        where: { folderName },
        data: packData,
      });
      result.updated += 1;
    } catch (error) {
      result.errors.push({
        folder: folderName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const scannedFolderNames = new Set(folderNames);

  for (const pack of existingPacks) {
    if (!scannedFolderNames.has(pack.folderName)) {
      console.warn(`Pack folder no longer exists on disk: "${pack.folderName}"`);
    }
  }

  return result;
}
