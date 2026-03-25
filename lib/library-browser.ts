export type BrowseDifficultySlot =
  | "Beginner"
  | "Easy"
  | "Medium"
  | "Hard"
  | "Expert"
  | "Custom";

export interface BrowseDifficulty {
  slot: BrowseDifficultySlot;
  level: number;
}

export interface BrowseSongRecord {
  id: string;
  title: string;
  artist: string;
  packId: number;
  pack: string;
  bpmLabel: string;
  bpmFilterMin: number | null;
  bpmFilterMax: number | null;
  difficulties: BrowseDifficulty[];
}

export interface BrowsePackRecord {
  id: number;
  folderName: string;
  title: string;
  songCount: number;
  platforms: string[];
  regions: string[];
  earliestRelease: string | null;
}

export interface BrowseArtistRecord {
  name: string;
  songCount: number;
}

export interface BrowseSongsResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  gameMode: string;
  songs: BrowseSongRecord[];
}

export interface BrowsePacksResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  gameMode: string;
  packs: BrowsePackRecord[];
}

export interface BrowseArtistsResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  gameMode: string;
  artists: BrowseArtistRecord[];
}

export function normalizeDifficultySlot(slot: string): BrowseDifficultySlot {
  switch (slot.trim().toLowerCase()) {
    case "beginner":
      return "Beginner";
    case "easy":
      return "Easy";
    case "medium":
      return "Medium";
    case "hard":
      return "Hard";
    case "challenge":
    case "expert":
      return "Expert";
    case "edit":
    case "custom":
      return "Custom";
    default:
      return "Custom";
  }
}

export function getDifficultyTone(slot: BrowseDifficultySlot) {
  switch (slot) {
    case "Beginner":
      return "difficulty-beginner";
    case "Easy":
      return "difficulty-easy";
    case "Medium":
      return "difficulty-medium";
    case "Hard":
      return "difficulty-hard";
    case "Expert":
      return "difficulty-expert";
    case "Custom":
      return "difficulty-custom";
  }
}

function clampDifficultyLevel(level: number) {
  return Math.max(1, Math.min(20, level));
}

function getDifficultyRangeColor(level: number) {
  const clamped = clampDifficultyLevel(level);
  const capped = Math.min(clamped, 15);
  const ratio = (capped - 1) / 14;
  const hue = 120 - ratio * 120;
  return `hsl(${hue} 68% 52%)`;
}

export function getDifficultyRange(song: Pick<BrowseSongRecord, "difficulties">) {
  const levels = song.difficulties.map((difficulty) => difficulty.level);
  return { min: Math.min(...levels), max: Math.max(...levels) };
}

export function hasCustomDifficulty(song: Pick<BrowseSongRecord, "difficulties">) {
  return song.difficulties.some((difficulty) => difficulty.slot === "Custom");
}

export function getDifficultyGradient(song: Pick<BrowseSongRecord, "difficulties">) {
  const sorted = [...song.difficulties].sort((left, right) => left.level - right.level);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];

  if (!low || !high) {
    return "var(--bg-muted-strong)";
  }

  const lowColor = getDifficultyRangeColor(low.level);
  const highColor = getDifficultyRangeColor(high.level);

  if (low.level === high.level) {
    return lowColor;
  }

  return `linear-gradient(180deg, ${lowColor} 0%, ${highColor} 100%)`;
}

export function splitPipeField(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getDisplayTitleFromTitles(titles: string[] | string) {
  if (Array.isArray(titles)) {
    return titles[0] ?? "";
  }

  return splitPipeField(titles)[0] ?? "";
}

export function getPreferredPlatform(platforms: string[]) {
  if (platforms.includes("Arcade")) {
    return "Arcade";
  }

  if (
    platforms.some((platform) =>
      ["Game Boy Color", "Nintendo 64", "GameCube", "Wii"].includes(platform),
    )
  ) {
    return "Nintendo Systems";
  }

  if (
    platforms.some((platform) =>
      ["PlayStation", "PlayStation 2", "PS3", "PS4", "PS5"].includes(platform),
    )
  ) {
    return "PlayStation Systems";
  }

  return platforms[0] ?? "";
}

function collapseRegions(regions: string[]) {
  const regionSet = new Set(regions);

  if (regionSet.has("Asia")) {
    regionSet.delete("Japan");
    regionSet.delete("Korea");
  }

  return [...regionSet];
}

function getRegionEmoji(region: string) {
  switch (region) {
    case "Japan":
      return "🇯🇵";
    case "Korea":
      return "🇰🇷";
    case "Asia":
      return "🌏";
    case "Europe":
      return "🇪🇺";
    case "North America":
      return "🇺🇸";
    case "South America":
      return "🌎";
    case "Oceania":
      return "🌊";
    default:
      return "";
  }
}

export function getPackRegionEmojis(regions: string[]) {
  return collapseRegions(regions).map(getRegionEmoji).filter(Boolean).join(" ");
}

export function getReleaseYear(earliestRelease: string | null) {
  return earliestRelease ? earliestRelease.slice(0, 4) : "";
}

export function formatBpmLabel(
  displayBpm: string | null,
  bpmMin: number | null,
  bpmMax: number | null,
) {
  if (displayBpm && displayBpm !== "*") {
    return displayBpm
      .replace(/\d+(?:\.\d+)?/g, (value) => String(Math.round(Number(value))))
      .replace(/\s*[:~]\s*/g, "-");
  }

  if (bpmMin == null || bpmMax == null) {
    return "";
  }

  const minLabel = String(Math.round(bpmMin));
  const maxLabel = String(Math.round(bpmMax));

  return minLabel === maxLabel ? minLabel : `${minLabel}-${maxLabel}`;
}
