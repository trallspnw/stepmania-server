/**
 * Machine-facing library manifest: every pack and available song with its checksum, for client song sync.
 */
// curl http://localhost:3000/api/game/library/manifest \
//   -H "Authorization: Bearer {your_token}"

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return new NextResponse(null, { status: 401 });
  }

  const packs = await prisma.pack.findMany({
    where: { songs: { some: { available: true } } },
    orderBy: { folderName: "asc" },
    select: {
      id: true,
      folderName: true,
      checksum: true,
      songs: {
        where: { available: true },
        orderBy: { filePath: "asc" },
        select: { id: true, filePath: true, checksum: true },
      },
    },
  });

  const manifestPacks = packs.map((pack) => ({
    id: pack.id,
    folder_name: pack.folderName,
    checksum: pack.checksum,
    songs: pack.songs.map((song) => ({
      id: song.id,
      folder_name: song.filePath.slice(pack.folderName.length + 1),
      checksum: song.checksum,
    })),
  }));

  // One hash over everything the manifest lists, so an unchanged library answers 304.
  const libraryChecksum = crypto
    .createHash("sha256")
    .update(JSON.stringify(manifestPacks))
    .digest("hex");
  const etag = `"${libraryChecksum}"`;
  const isUnchanged = request.headers.get("if-none-match") === etag;

  console.info("[machine] game.library.manifest.read", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: isUnchanged ? 304 : 200,
    packCount: manifestPacks.length,
  });

  if (isUnchanged) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return NextResponse.json(
    { library_checksum: libraryChecksum, packs: manifestPacks },
    { headers: { ETag: etag } },
  );
}
