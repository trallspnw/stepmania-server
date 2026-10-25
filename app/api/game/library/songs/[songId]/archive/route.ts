/**
 * Machine-facing download of one available song's folder as a zip, for client song sync.
 */
// curl -o song.zip http://localhost:3000/api/game/library/songs/1/archive \
//   -H "Authorization: Bearer {your_token}"

import fs from "node:fs";
import { NextResponse } from "next/server";
import { createFolderArchiveResponse } from "@/lib/library-archive";
import { validateMachineToken } from "@/lib/machineAuth";
import { prisma } from "@/lib/prisma";
import { resolveSongFolderPath } from "@/lib/song-files";

export async function GET(request: Request, context: { params: Promise<{ songId: string }> }) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return new NextResponse(null, { status: 401 });
  }

  const { songId: rawSongId } = await context.params;
  const songId = Number(rawSongId);
  const song = Number.isInteger(songId)
    ? await prisma.song.findFirst({ where: { id: songId, available: true }, select: { filePath: true } })
    : null;
  const songFolderPath = song ? resolveSongFolderPath(song.filePath) : null;

  if (!song || !songFolderPath || !fs.existsSync(songFolderPath)) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  console.info("[machine] game.library.song.archive", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    songId,
    songPath: song.filePath,
  });

  return createFolderArchiveResponse(songFolderPath, {
    isRecursive: true,
    downloadName: song.filePath.split("/").pop() ?? String(songId),
  });
}
