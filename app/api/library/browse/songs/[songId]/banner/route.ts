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

function resolveFirstExistingAsset(songFolderPath: string, candidates: Array<string | undefined>) {
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

function findFallbackImage(songFolderPath: string, fileStem: string) {
  const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
  const entries = fs.readdirSync(songFolderPath).filter((entry) => {
    const extension = path.extname(entry).toLowerCase();
    return imageExtensions.has(extension);
  });

  const preferredNames = [
    `${fileStem}.png`,
    `${fileStem}.jpg`,
    `${fileStem}.jpeg`,
    `${fileStem}-jacket.png`,
    `${fileStem}-jacket.jpg`,
    `${fileStem}-jacket.jpeg`,
    `${fileStem}-bg.png`,
    `${fileStem}-bg.jpg`,
    `${fileStem}-bg.jpeg`,
  ];

  for (const preferredName of preferredNames) {
    const match = entries.find((entry) => entry.toLowerCase() === preferredName.toLowerCase());

    if (match) {
      return path.join(songFolderPath, match);
    }
  }

  const genericMatch = entries.find((entry) => !entry.toLowerCase().includes("-bg."));
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
    const bannerTag = parsed.tags.BANNER?.trim();

    if (parsed.parseError) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    const simfileStem = path.basename(simfile.selectedPath, path.extname(simfile.selectedPath));
    const bannerPath =
      resolveFirstExistingAsset(songFolderPath, [
        parsed.tags.BANNER,
        parsed.tags.JACKET,
        parsed.tags.BACKGROUND,
        parsed.tags.CDIMAGE,
      ]) ?? findFallbackImage(songFolderPath, simfileStem);

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
