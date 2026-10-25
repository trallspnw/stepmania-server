/**
 * Machine-facing download of a pack's root files (pack.ini, pack banner) as a zip, for client song sync.
 */
// curl -o pack.zip http://localhost:3000/api/game/library/packs/1/archive \
//   -H "Authorization: Bearer {your_token}"

import fs from "node:fs";
import { NextResponse } from "next/server";
import { createFolderArchiveResponse } from "@/lib/library-archive";
import { validateMachineToken } from "@/lib/machineAuth";
import { prisma } from "@/lib/prisma";
import { resolveSongFolderPath } from "@/lib/song-files";

export async function GET(request: Request, context: { params: Promise<{ packId: string }> }) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return new NextResponse(null, { status: 401 });
  }

  const { packId: rawPackId } = await context.params;
  const packId = Number(rawPackId);
  const pack = Number.isInteger(packId)
    ? await prisma.pack.findUnique({ where: { id: packId }, select: { folderName: true } })
    : null;
  const packFolderPath = pack ? resolveSongFolderPath(pack.folderName) : null;

  if (!pack || !packFolderPath || !fs.existsSync(packFolderPath)) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  console.info("[machine] game.library.pack.archive", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    packId,
    packFolderName: pack.folderName,
  });

  return createFolderArchiveResponse(packFolderPath, { isRecursive: false, downloadName: pack.folderName });
}
