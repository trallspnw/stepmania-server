"use client";

import { CloseIcon, MusicIcon } from "@/components/icons";
import { useApp } from "@/lib/app-context";
import { getDifficultyTone } from "@/lib/library-browser";

export function QueueScreen() {
  const { currentUser, queueEntries, queueError, queueLoading, removeFromQueue } = useApp();

  if (queueLoading && queueEntries.length === 0) {
    return (
      <div className="emptyState">
        <div className="emptyStateIcon">
          <MusicIcon className="sectionIcon" />
        </div>
        <h2>Loading Queue</h2>
        <p>Fetching queued songs.</p>
      </div>
    );
  }

  if (queueError && queueEntries.length === 0) {
    return (
      <div className="emptyState">
        <div className="emptyStateIcon">
          <MusicIcon className="sectionIcon" />
        </div>
        <h2>Queue Unavailable</h2>
        <p>{queueError}</p>
      </div>
    );
  }

  if (queueEntries.length === 0) {
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
      {queueEntries.map((entry, index) => {
        const isPlaying = entry.status === "playing";
        const isOwn = entry.user.id === currentUser.id;

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
              <h3>{entry.song.title}</h3>
              <p className="muted">{entry.song.artist}</p>
              <div className="metaRow">
                <span
                  className={`pill ${getDifficultyTone(
                    entry.chart.difficultySlot,
                  )}`}
                >
                  {entry.chart.difficultySlot} {entry.chart.meter}
                </span>
                <span className="muted">by {entry.user.displayName}</span>
              </div>
            </div>
            {isOwn && !isPlaying ? (
              <button
                aria-label="Remove from queue"
                className="iconButton dangerButton"
                onClick={() => {
                  void removeFromQueue(entry.id);
                }}
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
