import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import { getServerHighScore, getUserHighScore } from "@/lib/play-history";
import { startCurrentQueueEntryWithExpectedIdAndDifficulty } from "@/lib/queue-server";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const queueItemId = Number(body?.queue_item_id);
  const chartId = Number(body?.chart_id);

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
  });
}
