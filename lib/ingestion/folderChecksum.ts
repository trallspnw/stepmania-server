/**
 * Content checksum of a song or pack folder, so any added, removed, renamed, or edited file changes it.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type FolderFile = {
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
};

function listFolderFiles(folderPath: string, isRecursive: boolean, relativePrefix = ""): FolderFile[] {
  const files: FolderFile[] = [];

  for (const entry of fs.readdirSync(folderPath)) {
    const absolutePath = path.join(folderPath, entry);
    const relativePath = relativePrefix ? `${relativePrefix}/${entry}` : entry;
    const stats = fs.statSync(absolutePath);

    if (stats.isDirectory()) {
      if (isRecursive) {
        files.push(...listFolderFiles(absolutePath, isRecursive, relativePath));
      }
      continue;
    }

    if (stats.isFile()) {
      files.push({ relativePath, absolutePath, sizeBytes: stats.size });
    }
  }

  return files;
}

/**
 * sha256 over every file in the folder, in UTF-8 byte order of the `/`-separated relative paths.
 * Each file contributes `path NUL size NUL bytes`; the size keeps one file's bytes from reading as the next path.
 * Clients recompute this to verify a download, so the recipe must stay byte-for-byte stable.
 */
export async function hashFolder(folderPath: string, options: { isRecursive: boolean }) {
  const files = listFolderFiles(folderPath, options.isRecursive).sort((a, b) =>
    Buffer.compare(Buffer.from(a.relativePath, "utf8"), Buffer.from(b.relativePath, "utf8")),
  );
  const hash = crypto.createHash("sha256");

  for (const file of files) {
    hash.update(`${file.relativePath}\0${file.sizeBytes}\0`, "utf8");
    for await (const chunk of fs.createReadStream(file.absolutePath)) {
      hash.update(chunk);
    }
  }

  return hash.digest("hex");
}
