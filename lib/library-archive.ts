/**
 * Streams a song or pack folder as an uncompressed zip, for client song sync.
 */
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import archiver from "archiver";
import { NextResponse } from "next/server";

/**
 * Zip entries are relative to the folder, so a client extracts them straight into its own copy of it.
 * Entries are stored, not compressed: audio and images are already compressed, so deflate only costs CPU.
 */
export function createFolderArchiveResponse(
  folderPath: string,
  options: { isRecursive: boolean; downloadName: string },
) {
  const archive = archiver("zip", { store: true });

  if (options.isRecursive) {
    archive.directory(folderPath, false);
  } else {
    for (const entry of fs.readdirSync(folderPath)) {
      const entryPath = path.join(folderPath, entry);
      if (fs.statSync(entryPath).isFile()) {
        archive.file(entryPath, { name: entry });
      }
    }
  }

  archive.on("error", (error) => {
    console.error("[machine] game.library.archive.error", { folderPath, error: error.message });
    archive.destroy(error);
  });
  void archive.finalize();

  return new NextResponse(Readable.toWeb(archive) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(options.downloadName)}.zip`,
    },
  });
}
