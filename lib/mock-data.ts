export type DifficultySlot =
  | "Beginner"
  | "Easy"
  | "Medium"
  | "Hard"
  | "Expert"
  | "Custom";
export type Grade = "S" | "A" | "B" | "C";

export interface Player {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface Difficulty {
  slot: DifficultySlot;
  level: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  pack: string;
  bpm: number;
  difficulties: Difficulty[];
}

export interface PackMetadata {
  titles: string[];
  platforms: string[];
  regions: string[];
  earliestRelease: string | null;
}

export interface HistoryEntry {
  id: string;
  playerId: string;
  songId: string;
  playedDifficulty: Difficulty;
  grade: Grade;
  completedAt: Date;
}

export const players: Player[] = [
  { id: "alex", name: "Alex", isAdmin: false },
  { id: "jordan", name: "Jordan", isAdmin: false },
  { id: "sam", name: "Sam", isAdmin: false },
  { id: "taylor", name: "Taylor", isAdmin: true },
];

export const songs: Song[] = [
  {
    id: "song-1",
    title: "MAX 300",
    artist: "Omega",
    pack: "DDRMAX",
    bpm: 300,
    difficulties: [
      { slot: "Beginner", level: 5 },
      { slot: "Easy", level: 8 },
      { slot: "Medium", level: 12 },
      { slot: "Hard", level: 15 },
      { slot: "Expert", level: 18 },
      { slot: "Custom", level: 19 },
    ],
  },
  {
    id: "song-2",
    title: "Pluto Relinquish",
    artist: "Black Rose Garden",
    pack: "In The Groove 2",
    bpm: 200,
    difficulties: [
      { slot: "Easy", level: 10 },
      { slot: "Medium", level: 15 },
      { slot: "Hard", level: 20 },
      { slot: "Expert", level: 24 },
    ],
  },
  {
    id: "song-3",
    title: "Butterfly",
    artist: "smile.dk",
    pack: "DDR 3rdMIX",
    bpm: 135,
    difficulties: [
      { slot: "Beginner", level: 1 },
      { slot: "Easy", level: 3 },
      { slot: "Medium", level: 6 },
      { slot: "Hard", level: 8 },
    ],
  },
  {
    id: "song-4",
    title: "Sakura",
    artist: "RevenG",
    pack: "DDR Extreme",
    bpm: 180,
    difficulties: [
      { slot: "Beginner", level: 3 },
      { slot: "Easy", level: 6 },
      { slot: "Medium", level: 9 },
      { slot: "Hard", level: 12 },
      { slot: "Expert", level: 14 },
    ],
  },
  {
    id: "song-5",
    title: "Fascination MAXX",
    artist: "100-200-400",
    pack: "DDR SuperNOVA",
    bpm: 400,
    difficulties: [
      { slot: "Medium", level: 14 },
      { slot: "Hard", level: 18 },
      { slot: "Expert", level: 22 },
    ],
  },
  {
    id: "song-6",
    title: "Tribal Style",
    artist: "Kevyn Lettau",
    pack: "DDR 4thMIX",
    bpm: 145,
    difficulties: [
      { slot: "Beginner", level: 1 },
      { slot: "Easy", level: 2 },
      { slot: "Medium", level: 4 },
      { slot: "Hard", level: 6 },
    ],
  },
  {
    id: "song-7",
    title: "Night of Fire",
    artist: "NIKO",
    pack: "Eurobeat Pack",
    bpm: 155,
    difficulties: [
      { slot: "Beginner", level: 2 },
      { slot: "Easy", level: 5 },
      { slot: "Medium", level: 9 },
      { slot: "Hard", level: 11 },
      { slot: "Expert", level: 13 },
    ],
  },
  {
    id: "song-8",
    title: "Tsugaru",
    artist: "RevenG vs De-Sire",
    pack: "DDR Extreme",
    bpm: 157,
    difficulties: [
      { slot: "Easy", level: 6 },
      { slot: "Medium", level: 10 },
      { slot: "Hard", level: 14 },
      { slot: "Expert", level: 16 },
    ],
  },
  {
    id: "song-9",
    title: "Speed Over Beethoven",
    artist: "Rose",
    pack: "DDR Extreme",
    bpm: 170,
    difficulties: [
      { slot: "Beginner", level: 3 },
      { slot: "Easy", level: 5 },
      { slot: "Medium", level: 8 },
      { slot: "Hard", level: 11 },
      { slot: "Expert", level: 13 },
    ],
  },
  {
    id: "song-10",
    title: "Paranoia Survivor",
    artist: "270",
    pack: "DDR Extreme",
    bpm: 270,
    difficulties: [
      { slot: "Easy", level: 7 },
      { slot: "Medium", level: 11 },
      { slot: "Hard", level: 14 },
      { slot: "Expert", level: 16 },
    ],
  },
  {
    id: "song-11",
    title: "Cartoon Heroes",
    artist: "Aqua",
    pack: "Novelty Pack",
    bpm: 130,
    difficulties: [
      { slot: "Beginner", level: 1 },
      { slot: "Easy", level: 3 },
      { slot: "Medium", level: 5 },
      { slot: "Hard", level: 7 },
    ],
  },
  {
    id: "song-12",
    title: "Sandstorm",
    artist: "Darude",
    pack: "EDM Classics",
    bpm: 136,
    difficulties: [
      { slot: "Beginner", level: 2 },
      { slot: "Easy", level: 4 },
      { slot: "Medium", level: 8 },
      { slot: "Hard", level: 10 },
      { slot: "Expert", level: 12 },
    ],
  },
  {
    id: "song-13",
    title: "Final Jason",
    artist: "DJ Mass MAD Izm*",
    pack: "J-Core Collection",
    bpm: 190,
    difficulties: [
      { slot: "Medium", level: 12 },
      { slot: "Hard", level: 17 },
      { slot: "Expert", level: 20 },
    ],
  },
  {
    id: "song-14",
    title: "Space Station Q",
    artist: "Tatsh",
    pack: "J-Core Collection",
    bpm: 165,
    difficulties: [
      { slot: "Easy", level: 7 },
      { slot: "Medium", level: 11 },
      { slot: "Hard", level: 15 },
      { slot: "Expert", level: 17 },
    ],
  },
  {
    id: "song-15",
    title: "Daft Punk Medley",
    artist: "Various Artists",
    pack: "EDM Classics",
    bpm: 128,
    difficulties: [
      { slot: "Beginner", level: 2 },
      { slot: "Easy", level: 4 },
      { slot: "Medium", level: 7 },
      { slot: "Hard", level: 9 },
    ],
  },
  {
    id: "song-16",
    title: "Running in the 90s",
    artist: "Max Coveri",
    pack: "Eurobeat Pack",
    bpm: 162,
    difficulties: [
      { slot: "Beginner", level: 2 },
      { slot: "Easy", level: 5 },
      { slot: "Medium", level: 8 },
      { slot: "Hard", level: 11 },
      { slot: "Expert", level: 14 },
    ],
  },
  {
    id: "song-17",
    title: "Gas Gas Gas",
    artist: "Manuel",
    pack: "Eurobeat Pack",
    bpm: 155,
    difficulties: [
      { slot: "Beginner", level: 2 },
      { slot: "Easy", level: 4 },
      { slot: "Medium", level: 7 },
      { slot: "Hard", level: 10 },
      { slot: "Expert", level: 13 },
    ],
  },
  {
    id: "song-18",
    title: "Afronova",
    artist: "RE-VENGE",
    pack: "DDR 3rdMIX",
    bpm: 200,
    difficulties: [
      { slot: "Easy", level: 6 },
      { slot: "Medium", level: 9 },
      { slot: "Hard", level: 12 },
      { slot: "Expert", level: 15 },
    ],
  },
];

export const packMetadata: Record<string, PackMetadata> = {
  DDRMAX: {
    titles: ["DDRMAX Dance Dance Revolution 6thMix"],
    platforms: ["Arcade", "PlayStation 2"],
    regions: ["Japan", "North America", "Europe"],
    earliestRelease: "2001-10-19",
  },
  "In The Groove 2": {
    titles: ["In The Groove 2"],
    platforms: ["Arcade", "PlayStation 2"],
    regions: ["North America"],
    earliestRelease: "2005-06-18",
  },
  "DDR 3rdMIX": {
    titles: ["Dance Dance Revolution 3rdMix"],
    platforms: ["Arcade", "PlayStation"],
    regions: ["Japan", "Asia", "North America"],
    earliestRelease: "1999-10-30",
  },
  "DDR Extreme": {
    titles: ["Dance Dance Revolution Extreme"],
    platforms: ["Arcade", "PlayStation 2"],
    regions: ["Japan", "Asia", "North America", "Europe"],
    earliestRelease: "2002-12-25",
  },
  "DDR SuperNOVA": {
    titles: ["Dance Dance Revolution SuperNova"],
    platforms: ["Arcade", "PlayStation 2"],
    regions: ["Europe", "North America", "Japan", "Asia", "South America"],
    earliestRelease: "2006-04-28",
  },
  "DDR 4thMIX": {
    titles: ["Dance Dance Revolution 4thMix"],
    platforms: ["Arcade", "PlayStation"],
    regions: ["Japan", "Korea", "Asia", "Europe"],
    earliestRelease: "2000-08-24",
  },
  "Eurobeat Pack": {
    titles: ["Eurobeat Pack"],
    platforms: ["Custom"],
    regions: [],
    earliestRelease: null,
  },
  "Novelty Pack": {
    titles: ["Novelty Pack"],
    platforms: ["Custom"],
    regions: [],
    earliestRelease: null,
  },
  "EDM Classics": {
    titles: ["EDM Classics"],
    platforms: ["Custom"],
    regions: [],
    earliestRelease: null,
  },
  "J-Core Collection": {
    titles: ["J-Core Collection"],
    platforms: ["Custom"],
    regions: [],
    earliestRelease: null,
  },
};

export const initialHistoryEntries: HistoryEntry[] = [
  {
    id: "history-1",
    playerId: "jordan",
    songId: "song-11",
    playedDifficulty: { slot: "Medium", level: 5 },
    grade: "S",
    completedAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "history-2",
    playerId: "alex",
    songId: "song-12",
    playedDifficulty: { slot: "Hard", level: 10 },
    grade: "A",
    completedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "history-3",
    playerId: "sam",
    songId: "song-6",
    playedDifficulty: { slot: "Easy", level: 2 },
    grade: "S",
    completedAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: "history-4",
    playerId: "taylor",
    songId: "song-2",
    playedDifficulty: { slot: "Expert", level: 24 },
    grade: "B",
    completedAt: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: "history-5",
    playerId: "jordan",
    songId: "song-8",
    playedDifficulty: { slot: "Hard", level: 14 },
    grade: "A",
    completedAt: new Date(Date.now() - 1000 * 60 * 180),
  },
  {
    id: "history-6",
    playerId: "alex",
    songId: "song-5",
    playedDifficulty: { slot: "Expert", level: 22 },
    grade: "C",
    completedAt: new Date(Date.now() - 1000 * 60 * 240),
  },
  {
    id: "history-7",
    playerId: "sam",
    songId: "song-9",
    playedDifficulty: { slot: "Medium", level: 8 },
    grade: "A",
    completedAt: new Date(Date.now() - 1000 * 60 * 300),
  },
  {
    id: "history-8",
    playerId: "taylor",
    songId: "song-1",
    playedDifficulty: { slot: "Expert", level: 18 },
    grade: "S",
    completedAt: new Date(Date.now() - 1000 * 60 * 360),
  },
];

export function getSongById(id: string) {
  return songs.find((song) => song.id === id);
}

export function getPlayerById(id: string) {
  return players.find((player) => player.id === id);
}

export function getDifficultyRange(song: Song) {
  const levels = song.difficulties.map((difficulty) => difficulty.level);
  return { min: Math.min(...levels), max: Math.max(...levels) };
}

export function getHighestDifficulty(song: Song) {
  return song.difficulties.reduce((highest, current) =>
    current.level > highest.level ? current : highest,
  );
}

export function hasCustomDifficulty(song: Song) {
  return song.difficulties.some((difficulty) => difficulty.slot === "Custom");
}

export function getUniquePacks() {
  return [...new Set(songs.map((song) => song.pack))].sort();
}

export function getUniqueArtists() {
  return [...new Set(songs.map((song) => song.artist))].sort();
}

function getPreferredPlatform(platforms: string[]) {
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

  if (platforms.some((platform) => ["PlayStation", "PlayStation 2"].includes(platform))) {
    return "PlayStation Systems";
  }

  return platforms[0] ?? "-";
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

export function getPackCardMeta(packName: string) {
  const metadata = packMetadata[packName];
  const songCount = songs.filter((song) => song.pack === packName).length;

  if (!metadata) {
    return {
      title: packName,
      songCount,
      platformLabel: "",
      releaseYear: "",
      regionEmojis: "",
    };
  }

  const collapsedRegions = collapseRegions(metadata.regions);
  const regionEmojis = collapsedRegions.map(getRegionEmoji).filter(Boolean).join(" ");

  return {
    title: metadata.titles[0] ?? packName,
    songCount,
    platformLabel: getPreferredPlatform(metadata.platforms),
    releaseYear: metadata.earliestRelease ? metadata.earliestRelease.slice(0, 4) : "",
    regionEmojis: regionEmojis || "",
  };
}

export function getDifficultyTone(slot: DifficultySlot) {
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

export function getDifficultyColorVar(slot: DifficultySlot) {
  switch (slot) {
    case "Beginner":
      return "var(--difficulty-beginner)";
    case "Easy":
      return "var(--difficulty-easy)";
    case "Medium":
      return "var(--difficulty-medium)";
    case "Hard":
      return "var(--difficulty-hard)";
    case "Expert":
      return "var(--difficulty-expert)";
    case "Custom":
      return "var(--difficulty-custom)";
  }
}

export function getDifficultyGradient(song: Song) {
  const sorted = [...song.difficulties].sort((left, right) => left.level - right.level);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];

  if (!low || !high) {
    return "var(--bg-muted-strong)";
  }

  const lowColor = getDifficultyColorVar(low.slot);
  const highColor = getDifficultyColorVar(high.slot);

  if (low.slot === high.slot) {
    return lowColor;
  }

  return `linear-gradient(180deg, ${lowColor} 0%, ${highColor} 100%)`;
}

export function getGradeTone(grade: Grade) {
  switch (grade) {
    case "S":
      return "grade-s";
    case "A":
      return "grade-a";
    case "B":
      return "grade-b";
    case "C":
      return "grade-c";
  }
}

export function formatRelativeTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
