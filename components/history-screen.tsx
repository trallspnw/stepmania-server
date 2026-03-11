"use client";

import { HistoryIcon } from "@/components/icons";
import { useApp } from "@/lib/app-context";
import {
  formatRelativeTime,
  getDifficultyTone,
  getGradeTone,
  getPlayerById,
  getSongById,
} from "@/lib/mock-data";

export function HistoryScreen() {
  const { state } = useApp();

  if (state.historyEntries.length === 0) {
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
      {state.historyEntries.map((entry) => {
        const song = getSongById(entry.songId);
        const player = getPlayerById(entry.playerId);

        if (!song || !player) return null;

        return (
          <article className="card historyCard" key={entry.id}>
            <div className="avatar">{player.name.charAt(0)}</div>
            <div className="historyContent">
              <h3>{song.title}</h3>
              <div className="metaRow wrap">
                <span>{player.name}</span>
                <span className={`pill ${getDifficultyTone(entry.playedDifficulty.slot)}`}>
                  {entry.playedDifficulty.level}
                </span>
                <span>{formatRelativeTime(entry.completedAt)}</span>
              </div>
            </div>
            <span className={`pill gradePill ${getGradeTone(entry.grade)}`}>
              {entry.grade}
            </span>
          </article>
        );
      })}
    </div>
  );
}
