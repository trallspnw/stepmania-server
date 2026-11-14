import { NextResponse } from "next/server";
import { getSideRecord, readChartId, readSide } from "@/lib/machine-players";
import { validateMachineToken } from "@/lib/machineAuth";
import { getServerHighScore, getUserHighScore } from "@/lib/play-history";
import { startCurrentQueueEntryWithExpectedIdAndDifficulty } from "@/lib/queue-server";

/**
 * Reads the optional `players: [{ side, chart_id }]` list: the sides playing
 * on the cabinet. Returns null if it's malformed or lists a side twice.
 */
function readStartPlayers(value: unknown) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const players = value.map((player) => ({
    side: readSide(player?.side),
    chartId: readChartId(player?.chart_id),
  }));
  const sides = new Set(players.map((player) => player.side));

  if (players.some((player) => player.side === null || player.chartId === null) || sides.size !== players.length) {
    return null;
  }

  return players as { side: 1 | 2; chartId: number }[];
}

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const queueItemId = Number(body?.queue_item_id);
  const startPlayers = readStartPlayers(body?.players);

  if (startPlayers === null) {
    return NextResponse.json(
      { error: "players must be a list of { side: 1 or 2, chart_id }, one per side" },
      { status: 400 },
    );
  }

  const chartId = startPlayers.find((player) => player.side === 1)?.chartId ?? Number(body?.chart_id);
  const sideTwoChartId = startPlayers.find((player) => player.side === 2)?.chartId ?? null;

  if (!Number.isInteger(queueItemId) || queueItemId <= 0) {
    console.info("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: body?.queue_item_id ?? null,
    });

    return NextResponse.json(
      { error: "queue_item_id must be a positive integer" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(chartId) || chartId <= 0) {
    return NextResponse.json(
      { error: "chart_id must be a positive integer" },
      { status: 400 },
    );
  }

  const startedEntry = await startCurrentQueueEntryWithExpectedIdAndDifficulty({
    expectedQueueEntryId: queueItemId,
    chartId,
    sideTwoChartId,
  });

  if (startedEntry.status === "missing") {
    console.info("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: false,
    });

    return NextResponse.json({ error: "No current song set" }, { status: 400 });
  }

  if (startedEntry.status === "mismatch") {
    console.warn("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: startedEntry.current.id,
      actualSongPath: startedEntry.current.song.filePath,
    });

    return NextResponse.json(
      { error: "queue_item_id does not match the current queue item" },
      { status: 400 },
    );
  }

  if (startedEntry.status === "invalid_chart") {
    console.info("[machine] game.song.start", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: startedEntry.current.id,
      actualSongPath: startedEntry.current.song.filePath,
      queuedDifficultyName: startedEntry.current.chart.difficultySlot,
      chartId,
    });

    return NextResponse.json(
      { error: "chart_id does not match an available chart for the queued song and mode" },
      { status: 400 },
    );
  }

  const { entry, playedChart } = startedEntry;
  const startedSides = await Promise.all([
    getSideRecord(entry.song.id, { side: 1, user: entry.user, chart: playedChart }),
    ...(entry.joinedUser && entry.joinedChart
      ? [getSideRecord(entry.song.id, { side: 2, user: entry.joinedUser, chart: entry.joinedChart })]
      : []),
  ]);
  const [userHighScore, serverHighScore] = await Promise.all([
    getUserHighScore({
      songId: startedEntry.entry.song.id,
      chartId: startedEntry.playedChart.id,
      userId: startedEntry.entry.user.id,
    }),
    getServerHighScore({
      songId: startedEntry.entry.song.id,
      chartId: startedEntry.playedChart.id,
    }),
  ]);

  console.info("[machine] game.song.start", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
    hasSong: true,
    songPath: startedEntry.entry.song.filePath,
    playerId: startedEntry.entry.user.id,
    queueEntryId: startedEntry.entry.id,
    chartId: startedEntry.playedChart.id,
    queuedDifficultyName: startedEntry.entry.chart.difficultySlot,
    playedDifficultyName: startedEntry.playedChart.difficultySlot,
    sides: startedSides.length,
  });

  return NextResponse.json({
    ok: true,
    queue_item_id: startedEntry.entry.id,
    song: {
      file_path: startedEntry.entry.song.filePath,
      chart_id: startedEntry.playedChart.id,
      difficulty_name: startedEntry.playedChart.difficultySlot,
    },
    player: {
      id: startedEntry.entry.user.id,
      display_name: startedEntry.entry.user.displayName,
    },
    user_highscore: userHighScore,
    server_highscore: serverHighScore,
    players: startedSides,
  });
}
