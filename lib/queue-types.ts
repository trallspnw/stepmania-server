import type { BrowseDifficultySlot } from "@/lib/library-browser";

export interface QueueEntryRecord {
  id: number;
  status: "queued" | "playing";
  playOrder: number;
  createdAt: string;
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
  canRemove: boolean;
}

export interface QueueResponse {
  entries: QueueEntryRecord[];
}
