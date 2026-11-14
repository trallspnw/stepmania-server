// curl http://localhost:3000/api/game/song/current
// curl http://localhost:3000/api/game/song/current \
//   -H "Authorization: Bearer {your_token}"

import { NextResponse } from "next/server";
import { getQueuedSideRecord } from "@/lib/machine-players";
import { validateMachineToken } from "@/lib/machineAuth";
import {
  getChartHighScoresForSong,
  getServerHighScore,
  getUserHighScore,
} from "@/lib/play-history";
import { getCurrentQueueEntry } from "@/lib/queue-server";

export async function GET(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return new NextResponse(null, { status: 401 });
  }

  const currentQueueEntry = await getCurrentQueueEntry();

  if (!currentQueueEntry) {
    console.info("[machine] game.song.current.read", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 200,
      hasSong: false,
    });

    return NextResponse.json({
      song: null,
      player: null,
      user_highscore: null,
      server_highscore: null,
      players: [],
    });
  }

  const songPath = currentQueueEntry.song.filePath;
  const difficulty = currentQueueEntry.chart.difficultySlot;
  const activePlayer = {
    id: currentQueueEntry.user.id,
    display_name: currentQueueEntry.user.displayName,
  };
  const resolvedSongChart = {
    songId: currentQueueEntry.song.id,
    chartId: currentQueueEntry.chart.id,
  };

  const [userHighScore, serverHighScore, chartHighScores] = await Promise.all([
    activePlayer && resolvedSongChart
      ? getUserHighScore({
          songId: resolvedSongChart.songId,
          chartId: resolvedSongChart.chartId,
          userId: activePlayer.id,
        })
      : Promise.resolve(null),
    resolvedSongChart
      ? getServerHighScore({
          songId: resolvedSongChart.songId,
          chartId: resolvedSongChart.chartId,
        })
      : Promise.resolve(null),
    getChartHighScoresForSong({
      songId: currentQueueEntry.song.id,
      gameMode: currentQueueEntry.chart.gameMode,
      userId: activePlayer.id,
    }),
  ]);

  const queuedSong = {
    id: currentQueueEntry.song.id,
    gameMode: currentQueueEntry.chart.gameMode,
  };
  const { joinedUser, joinedChart } = currentQueueEntry;
  const players = await Promise.all([
    getQueuedSideRecord(queuedSong, {
      side: 1,
      user: currentQueueEntry.user,
      chart: currentQueueEntry.chart,
    }),
    ...(joinedUser && joinedChart
      ? [getQueuedSideRecord(queuedSong, { side: 2, user: joinedUser, chart: joinedChart })]
      : []),
  ]);

  console.info("[machine] game.song.current.read", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
    hasSong: true,
    sides: players.length,
    songPath,
    difficulty,
    playerId: activePlayer?.id ?? null,
  });

  return NextResponse.json({
    queue_item_id: currentQueueEntry.id,
    song: {
      file_path: songPath,
      difficulty_name: difficulty,
    },
    player: activePlayer,
    user_highscore: userHighScore,
    server_highscore: serverHighScore,
    chart_highscores: chartHighScores,
    players,
  });
}
