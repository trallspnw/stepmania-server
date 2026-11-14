/**
 * The per-side player records the machine API returns: side 1 is the queue
 * entry's owner, side 2 the player who joined it.
 */
import { normalizeDifficultySlot } from "@/lib/library-browser";
import { getChartHighScoresForSong, getServerHighScore, getUserHighScore } from "@/lib/play-history";

export type MachineSide = 1 | 2;

type SidePlayer = {
  side: MachineSide;
  user: { id: number; displayName: string };
  chart: { id: number; difficultySlot: string };
};

/** One side's player, chart, and its records on that chart. */
export async function getSideRecord(songId: number, sidePlayer: SidePlayer) {
  const [userHighScore, serverHighScore] = await Promise.all([
    getUserHighScore({ songId, chartId: sidePlayer.chart.id, userId: sidePlayer.user.id }),
    getServerHighScore({ songId, chartId: sidePlayer.chart.id }),
  ]);

  return {
    side: sidePlayer.side,
    player: {
      id: sidePlayer.user.id,
      display_name: sidePlayer.user.displayName,
    },
    chart_id: sidePlayer.chart.id,
    difficulty_name: normalizeDifficultySlot(sidePlayer.chart.difficultySlot),
    user_highscore: userHighScore,
    server_highscore: serverHighScore,
  };
}

/**
 * One side's queued chart plus its records on every chart of the song, so
 * the cabinet can show the right records as the player changes difficulty.
 */
export async function getQueuedSideRecord(song: { id: number; gameMode: string }, sidePlayer: SidePlayer) {
  const [sideRecord, chartHighScores] = await Promise.all([
    getSideRecord(song.id, sidePlayer),
    getChartHighScoresForSong({ songId: song.id, gameMode: song.gameMode, userId: sidePlayer.user.id }),
  ]);

  return {
    ...sideRecord,
    chart_highscores: chartHighScores,
  };
}

/** Reads a positive integer chart id, or null if the value isn't one. */
export function readChartId(value: unknown) {
  const chartId = Number(value);
  return Number.isInteger(chartId) && chartId > 0 ? chartId : null;
}

export function readSide(value: unknown): MachineSide | null {
  return value === 1 || value === 2 ? value : null;
}
