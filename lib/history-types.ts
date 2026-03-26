import type { BrowseDifficultySlot } from "@/lib/library-browser";
import type { Grade } from "@/lib/mock-data";

export interface HistoryRecord {
  id: number;
  playedAt: string;
  score: number | null;
  grade: Grade | string | null;
  isTest: boolean;
  user: {
    id: number;
    displayName: string;
  };
  song: {
    id: number;
    title: string;
    artist: string;
  };
  chart: {
    id: number;
    difficultySlot: BrowseDifficultySlot;
    meter: number;
  };
}

export interface HistoryResponse {
  entries: HistoryRecord[];
}
