// curl -X POST http://localhost:3000/api/game/song/finish
// curl -X POST http://localhost:3000/api/game/song/finish \
//   -H "Authorization: Bearer {your_token}" \
//   -H "Content-Type: application/json" \
//   -d '{"score": 100.00, "grade": "AAA"}'
// curl -X POST http://localhost:3000/api/game/song/finish \
//   -H "Authorization: Bearer {your_token}" \
//   -H "Content-Type: application/json" \
//   -d '{"score": 75.23, "grade": "B"}'

import { NextResponse } from "next/server";
import { validateMachineToken } from "@/lib/machineAuth";
import {
  getServerHighScore,
  getUserHighScore,
} from "@/lib/play-history";
import { finishCurrentQueueEntry } from "@/lib/queue-server";

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const score = Number(body?.score);
  const isTest = body?.test === true;
  const grade =
    typeof body?.grade === "string"
      ? body.grade.trim()
      : "";
  const playedDifficulty =
    typeof body?.difficulty_name === "string"
      ? body.difficulty_name.trim()
      : "";
  const queueItemId = Number(body?.queue_item_id);

  if (!Number.isFinite(score) || score < 0) {
    return NextResponse.json(
      { error: "score must be a non-negative decimal value" },
      { status: 400 },
    );
  }

  if (!grade) {
    return NextResponse.json(
      { error: "grade must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!playedDifficulty) {
    return NextResponse.json(
      { error: "difficulty_name must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(queueItemId) || queueItemId <= 0) {
    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: body?.queue_item_id ?? null,
      score,
      grade,
      difficultyName: playedDifficulty || null,
    });

    return NextResponse.json(
      { error: "queue_item_id must be a positive integer" },
      { status: 400 },
    );
  }

  const consumed = await finishCurrentQueueEntry({
    score,
    grade,
    isTest,
    expectedQueueEntryId: queueItemId,
    difficultyName: playedDifficulty,
  });

  if (consumed.status === "finished") {
    const [userHighScore, serverHighScore] = await Promise.all([
      getUserHighScore({
        songId: consumed.removed.song.id,
        chartId: consumed.playedChart.id,
        userId: consumed.removed.user.id,
      }),
      getServerHighScore({
        songId: consumed.removed.song.id,
        chartId: consumed.playedChart.id,
      }),
    ]);

    console.log("[finish] score received:", {
      songPath: consumed.removed.song.filePath,
      playerId: consumed.removed.user.id,
      score,
      grade,
      difficultyName: consumed.playedChart.difficultySlot,
      isTest,
      playedAt: new Date().toISOString(),
    });

    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 200,
      hasSong: true,
      finishedSongPath: consumed.removed.song.filePath,
      playerId: consumed.removed.user.id,
      queueEntryId: consumed.removed.id,
      queuedDifficultyName: consumed.removed.chart.difficultySlot,
      playedDifficultyName: consumed.playedChart.difficultySlot,
      nextSongPath: consumed.next?.song.filePath ?? null,
      score,
      grade,
      isTest,
    });

    return NextResponse.json({
      recorded: true,
      queue_item_id: consumed.removed.id,
      user_highscore: userHighScore,
      server_highscore: serverHighScore,
      next_song: consumed.next
        ? {
            queue_item_id: consumed.next.id,
            file_path: consumed.next.song.filePath,
            difficulty_name: consumed.next.chart.difficultySlot,
          }
        : null,
    });
  }

  if (consumed.status === "invalid_difficulty") {
    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: consumed.current.id,
      actualSongPath: consumed.current.song.filePath,
      queuedDifficultyName: consumed.current.chart.difficultySlot,
      difficultyName: playedDifficulty,
      normalizedDifficultyName: consumed.normalizedDifficultyName,
      score,
      grade,
    });

    return NextResponse.json(
      { error: "difficulty_name does not match an available chart for the queued song" },
      { status: 400 },
    );
  }

  if (consumed.status === "mismatch") {
    console.warn("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: consumed.current.id,
      actualSongPath: consumed.current.song.filePath,
      score,
      grade,
    });

    return NextResponse.json(
      {
        error: "queue_item_id does not match the current queue item",
      },
      { status: 400 },
    );
  }

  console.info("[machine] game.song.finish", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 400,
    hasSong: false,
    score,
    grade,
  });

  return NextResponse.json({ error: "No current song set" }, { status: 400 });
}
