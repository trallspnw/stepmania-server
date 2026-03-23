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
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

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
    const bannerTag = parsed.tags.BANNER?.trim();

    if (parsed.parseError || !bannerTag) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    const bannerPath = resolveSongAssetPath(songFolderPath, bannerTag);

    if (!bannerPath || !fs.existsSync(bannerPath) || !fs.statSync(bannerPath).isFile()) {
      return NextResponse.json({ error: "Banner file not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(bannerPath);
    const contentType = CONTENT_TYPES[path.extname(bannerPath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load banner" },
      { status: 500 },
    );
  }
}
