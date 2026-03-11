"use client";

import { LogOutIcon, MusicIcon, TrophyIcon } from "@/components/icons";
import { useApp } from "@/lib/app-context";
import {
  formatRelativeTime,
  getDifficultyTone,
  getGradeTone,
  getPlayerById,
  getSongById,
} from "@/lib/mock-data";

export function ProfileScreen() {
  const { state, signOut } = useApp();
  const currentPlayer = getPlayerById(state.currentPlayerId);

  if (!currentPlayer) {
    return (
      <div className="emptyState">
        <h2>Signed Out</h2>
        <p>You have been signed out.</p>
      </div>
    );
  }

  const myQueueEntries = state.queueEntries.filter(
    (entry) => entry.playerId === state.currentPlayerId,
  );
  const myHistoryEntries = state.historyEntries.filter(
    (entry) => entry.playerId === state.currentPlayerId,
  );

  return (
    <div className="stack profileStack">
      <section className="profileHero">
        <div className="profileAvatar">{currentPlayer.name.charAt(0)}</div>
        <div>
          <h2>{currentPlayer.name}</h2>
          {currentPlayer.isAdmin ? <span className="softPill">Admin</span> : null}
        </div>
      </section>

      <section className="card panelCard">
        <header className="panelHeader">
          <div className="panelTitle">
            <MusicIcon className="tinyIcon" />
            <span>My Queue ({myQueueEntries.length})</span>
          </div>
        </header>
        {myQueueEntries.length === 0 ? (
          <p className="muted">No songs in your queue.</p>
        ) : (
          <div className="stack tight">
            {myQueueEntries.map((entry) => {
              const song = getSongById(entry.songId);
              if (!song) return null;

              return (
                <div className="splitRow" key={entry.id}>
                  <div>
                    <h3>{song.title}</h3>
                    <p className="muted">{song.artist}</p>
                  </div>
                  <span
                    className={`pill ${getDifficultyTone(
                      entry.selectedDifficulty.slot,
                    )}`}
                  >
                    {entry.selectedDifficulty.slot} {entry.selectedDifficulty.level}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card panelCard">
        <header className="panelHeader">
          <div className="panelTitle">
            <TrophyIcon className="tinyIcon" />
            <span>My History ({myHistoryEntries.length})</span>
          </div>
        </header>
        {myHistoryEntries.length === 0 ? (
          <p className="muted">No play history yet.</p>
        ) : (
          <div className="stack tight">
            {myHistoryEntries.map((entry) => {
              const song = getSongById(entry.songId);
              if (!song) return null;

              return (
                <div className="splitRow" key={entry.id}>
                  <div>
                    <h3>{song.title}</h3>
                    <div className="metaRow wrap">
                      <span className={`pill ${getDifficultyTone(entry.playedDifficulty.slot)}`}>
                        {entry.playedDifficulty.level}
                      </span>
                      <span className="muted">{formatRelativeTime(entry.completedAt)}</span>
                    </div>
                  </div>
                  <span className={`pill gradePill ${getGradeTone(entry.grade)}`}>
                    {entry.grade}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <button className="ghostButton logoutButton" onClick={signOut} type="button">
        <LogOutIcon className="tinyIcon" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
