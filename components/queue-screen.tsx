"use client";

/**
 * The shared play queue: one card per queued song, with its player and any
 * second player who joined, plus remove, join and leave actions.
 */
import { useState } from "react";
import { CloseIcon, MusicIcon } from "@/components/icons";
import { SongDetailSheet } from "@/components/song-detail-sheet";
import { useApp } from "@/lib/app-context";
import { BrowseSongRecord, getDifficultyTone } from "@/lib/library-browser";
import type { QueueChartRecord, QueueEntryRecord } from "@/lib/queue-types";

function DifficultyPill({ chart }: { chart: QueueChartRecord }) {
  return (
    <span className={`pill ${getDifficultyTone(chart.difficultySlot)}`}>
      {chart.difficultySlot} {chart.meter}
    </span>
  );
}

export function QueueScreen() {
  const { queueEntries, queueError, queueLoading, removeFromQueue, leaveQueueEntry } = useApp();
  const [joinEntry, setJoinEntry] = useState<QueueEntryRecord | null>(null);
  const [joinSong, setJoinSong] = useState<BrowseSongRecord | null>(null);
  const [joinLoadingEntryId, setJoinLoadingEntryId] = useState<number | null>(null);

  async function openJoinSheet(entry: QueueEntryRecord) {
    setJoinLoadingEntryId(entry.id);

    const response = await fetch(`/api/library/browse/songs/${entry.song.id}`, {
      cache: "no-store",
      credentials: "same-origin",
    });

    setJoinLoadingEntryId(null);

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { song: BrowseSongRecord };
    setJoinEntry(entry);
    setJoinSong(data.song);
  }

  function closeJoinSheet() {
    setJoinEntry(null);
    setJoinSong(null);
  }

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
                <DifficultyPill chart={entry.chart} />
                <span className="muted">by {entry.user.displayName}</span>
              </div>
              {entry.joined ? (
                <div className="metaRow">
                  <DifficultyPill chart={entry.joined.chart} />
                  <span className="muted">with {entry.joined.user.displayName}</span>
                </div>
              ) : null}
            </div>
            <div className="queueActions">
              {entry.canRemove && !isPlaying ? (
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
              {entry.canJoin ? (
                <button
                  className="ghostButton queueActionButton"
                  disabled={joinLoadingEntryId === entry.id}
                  onClick={() => {
                    void openJoinSheet(entry);
                  }}
                  type="button"
                >
                  Join
                </button>
              ) : null}
              {entry.canLeave ? (
                <button
                  className="ghostButton queueActionButton dangerButton"
                  onClick={() => {
                    void leaveQueueEntry(entry.id);
                  }}
                  type="button"
                >
                  Leave
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
      <SongDetailSheet
        initialChartId={joinEntry?.chart.id}
        joinEntryId={joinEntry?.id}
        onClose={closeJoinSheet}
        song={joinSong}
      />
    </div>
  );
}
