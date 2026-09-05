"use client";

import { useState } from "react";
import { HistoryIcon } from "@/components/icons";
import { SongDetailSheet } from "@/components/song-detail-sheet";
import { useApp } from "@/lib/app-context";
import type { BrowseSongRecord } from "@/lib/library-browser";
import { formatRelativeTime, getDifficultyTone, getGradeTone } from "@/lib/mock-data";

export function HistoryScreen() {
  const { historyEntries, historyError, historyLoading } = useApp();
  const [selectedSong, setSelectedSong] = useState<BrowseSongRecord | null>(null);

  async function openSongDetail(songId: number) {
    const response = await fetch(`/api/library/browse/songs/${songId}`, {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { song: BrowseSongRecord };
    setSelectedSong(data.song);
  }

  if (historyLoading && historyEntries.length === 0) {
    return (
      <div className="emptyState">
        <div className="emptyStateIcon">
          <HistoryIcon className="sectionIcon" />
        </div>
        <h2>Loading History</h2>
        <p>Fetching recent plays.</p>
      </div>
    );
  }

  if (historyError && historyEntries.length === 0) {
    return (
      <div className="emptyState">
        <div className="emptyStateIcon">
          <HistoryIcon className="sectionIcon" />
        </div>
        <h2>History Unavailable</h2>
        <p>{historyError}</p>
      </div>
    );
  }

  if (historyEntries.length === 0) {
    return (
      <div className="emptyState">
        <div className="emptyStateIcon">
          <HistoryIcon className="sectionIcon" />
        </div>
        <h2>No Play History</h2>
        <p>Completed songs will appear here.</p>
      </div>
    );
  }

  return (
    <div className="stack tight">
      {historyEntries.map((entry) => (
        <button
          className="card historyCard"
          key={entry.id}
          onClick={() => void openSongDetail(entry.song.id)}
          type="button"
        >
          <div className="avatar">{entry.user.displayName.charAt(0)}</div>
          <div className="historyContent">
            <h3>{entry.song.title}</h3>
            <div className="metaRow wrap">
              <span>{entry.user.displayName}</span>
              <span className={`pill ${getDifficultyTone(entry.chart.difficultySlot)}`}>
                {entry.chart.meter}
              </span>
              {entry.score != null ? <span>{entry.score.toFixed(2)}%</span> : null}
              {entry.isTest ? <span className="softPill">Test</span> : null}
              <span>{formatRelativeTime(new Date(entry.playedAt))}</span>
            </div>
          </div>
          <span className={`pill gradePill ${getGradeTone(entry.grade ?? "C")}`}>
            {entry.grade ?? "-"}
          </span>
        </button>
      ))}

      <SongDetailSheet onClose={() => setSelectedSong(null)} song={selectedSong} />
    </div>
  );
}
