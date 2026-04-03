import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/admin";
import { parseSimfile } from "@/lib/ingestion/parseSimfile";
import { prisma } from "@/lib/prisma";
import {
  chooseSimfile,
  resolveSongAssetPath,
  resolveSongFolderPath,
} from "@/lib/song-files";

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".wav": "audio/wav",
  ".opus": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
};

function resolveFirstExistingAudio(songFolderPath: string, candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (!candidate?.trim()) {
      continue;
    }

    const resolvedPath = resolveSongAssetPath(songFolderPath, candidate);

    if (resolvedPath && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      return resolvedPath;
    }
  }

  return null;
}

function findFallbackAudio(songFolderPath: string, fileStem: string) {
  const audioExtensions = new Set([".mp3", ".ogg", ".oga", ".wav", ".opus", ".m4a", ".aac", ".flac"]);
  const entries = fs.readdirSync(songFolderPath).filter((entry) => {
    const extension = path.extname(entry).toLowerCase();
    return audioExtensions.has(extension);
  });

  const preferredNames = [
    `${fileStem}.mp3`,
    `${fileStem}.ogg`,
    `${fileStem}.oga`,
    `${fileStem}.wav`,
    `${fileStem}.opus`,
    `${fileStem}.m4a`,
    `${fileStem}.aac`,
    `${fileStem}.flac`,
  ];

  for (const preferredName of preferredNames) {
    const match = entries.find((entry) => entry.toLowerCase() === preferredName.toLowerCase());

    if (match) {
      return path.join(songFolderPath, match);
    }
  }

  const genericMatch = entries[0];
  return genericMatch ? path.join(songFolderPath, genericMatch) : null;
}

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

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      filePath: true,
      available: true,
    },
  });

  if (!song || !song.available) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  try {
    const songFolderPath = resolveSongFolderPath(song.filePath);

    if (!fs.existsSync(songFolderPath) || !fs.statSync(songFolderPath).isDirectory()) {
      return NextResponse.json({ error: "Song folder not found" }, { status: 404 });
    }

    const simfile = chooseSimfile(songFolderPath);

    if (!simfile.selectedPath) {
      return NextResponse.json({ error: "Simfile not found" }, { status: 404 });
    }

    const parsed = parseSimfile(simfile.selectedPath);

    if (parsed.parseError) {
      return NextResponse.json({ error: "Preview audio not found" }, { status: 404 });
    }

    const simfileStem = path.basename(simfile.selectedPath, path.extname(simfile.selectedPath));
    const audioPath =
      resolveFirstExistingAudio(songFolderPath, [parsed.tags.MUSIC]) ??
      findFallbackAudio(songFolderPath, simfileStem);

    if (!audioPath || !fs.existsSync(audioPath) || !fs.statSync(audioPath).isFile()) {
      return NextResponse.json({ error: "Preview audio file not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(audioPath);
    const contentType = CONTENT_TYPES[path.extname(audioPath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load preview audio" },
      { status: 500 },
    );
  }
}
