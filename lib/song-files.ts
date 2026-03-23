import fs from "node:fs";
import path from "node:path";

export function chooseSimfile(songFolderPath: string) {
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

export function getSongsRoot() {
  const fallbackSongsDir = [".data", "Songs"].join(path.sep);
  return path.resolve(process.env.SONGS_DIR ?? fallbackSongsDir);
}

export function resolveSongFolderPath(filePath: string) {
  const songsRoot = getSongsRoot();
  const songFolderPath = path.resolve(songsRoot, filePath);

  if (songFolderPath !== songsRoot && !songFolderPath.startsWith(`${songsRoot}${path.sep}`)) {
    throw new Error("Resolved song path escapes songs root");
  }

  return songFolderPath;
}

export function resolveSongAssetPath(songFolderPath: string, rawAssetPath: string) {
  const normalizedAssetPath = rawAssetPath.trim().replace(/\\/g, "/");

  if (!normalizedAssetPath) {
    return null;
  }

  const absoluteAssetPath = path.resolve(songFolderPath, normalizedAssetPath);

  if (
    absoluteAssetPath !== songFolderPath &&
    !absoluteAssetPath.startsWith(`${songFolderPath}${path.sep}`)
  ) {
    return null;
  }

  return absoluteAssetPath;
}
