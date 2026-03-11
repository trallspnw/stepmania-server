"use client";

import { CloseIcon, MusicIcon } from "@/components/icons";
import { useApp } from "@/lib/app-context";
import {
  getDifficultyTone,
  getPlayerById,
  getSongById,
} from "@/lib/mock-data";

export function QueueScreen() {
  const { state, removeFromQueue } = useApp();

  if (state.queueEntries.length === 0) {
    return (
      <div className="emptyState">
        <div className="emptyStateIcon">
          <MusicIcon className="sectionIcon" />
        </div>
        <h2>Queue is Empty</h2>
        <p>Browse songs and add them to the queue to get started.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {state.queueEntries.map((entry, index) => {
        const song = getSongById(entry.songId);
        const player = getPlayerById(entry.playerId);

        if (!song || !player) return null;

        const isPlaying = entry.status === "playing";
        const isOwn = entry.playerId === state.currentPlayerId;

        return (
          <article
            key={entry.id}
            className={`card queueCard${isPlaying ? " isPlaying" : ""}`}
          >
            <div className="queueMeta">
              <span className="queuePosition">#{index + 1}</span>
              {isPlaying ? <span className="liveDot" /> : null}
            </div>
            <div className="queueContent">
              {isPlaying ? <span className="eyebrowPill">Now Playing</span> : null}
              <h3>{song.title}</h3>
              <p className="muted">{song.artist}</p>
              <div className="metaRow">
                <span
                  className={`pill ${getDifficultyTone(
                    entry.selectedDifficulty.slot,
                  )}`}
                >
                  {entry.selectedDifficulty.slot} {entry.selectedDifficulty.level}
                </span>
                <span className="muted">by {player.name}</span>
              </div>
            </div>
            {isOwn && !isPlaying ? (
              <button
                aria-label="Remove from queue"
                className="iconButton dangerButton"
                onClick={() => removeFromQueue(entry.id)}
                type="button"
              >
                <CloseIcon className="tinyIcon" />
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
