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

  const consumed = await finishCurrentQueueEntry({ score, grade, isTest });

  if (consumed) {
    const [userHighScore, serverHighScore] = await Promise.all([
      getUserHighScore({
        songId: consumed.removed.song.id,
        chartId: consumed.removed.chart.id,
        userId: consumed.removed.user.id,
      }),
      getServerHighScore({
        songId: consumed.removed.song.id,
        chartId: consumed.removed.chart.id,
      }),
    ]);

    console.log("[finish] score received:", {
      songPath: consumed.removed.song.filePath,
      playerId: consumed.removed.user.id,
      score,
      grade,
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
      nextSongPath: consumed.next?.song.filePath ?? null,
      score,
      grade,
      isTest,
    });

    return NextResponse.json({
      recorded: true,
      user_highscore: userHighScore,
      server_highscore: serverHighScore,
      next_song: consumed.next
        ? {
            file_path: consumed.next.song.filePath,
            difficulty_name: consumed.next.chart.difficultySlot,
          }
        : null,
    });
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
