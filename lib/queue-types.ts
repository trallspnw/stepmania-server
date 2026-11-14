import type { BrowseDifficultySlot } from "@/lib/library-browser";

export interface QueueChartRecord {
  id: number;
  difficultySlot: BrowseDifficultySlot;
  meter: number;
}

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
  chart: QueueChartRecord;
  /** The second player (P2) playing along, if someone joined. */
  joined: {
    user: {
      id: number;
      displayName: string;
    };
    chart: QueueChartRecord;
  } | null;
  canRemove: boolean;
  canJoin: boolean;
  canLeave: boolean;
}

export interface QueueResponse {
  entries: QueueEntryRecord[];
}
