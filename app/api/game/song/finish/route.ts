// curl -X POST http://localhost:3000/api/game/song/finish \
//   -H "Authorization: Bearer {your_token}" \
//   -H "Content-Type: application/json" \
//   -d '{"queue_item_id": 42, "results": [{"side": 1, "chart_id": 1002, "score": 97.43, "grade": "AA"}]}'

/**
 * Records the cabinet's results for the current song, one per side, and
 * advances the queue. A single top-level result (no `results` list) is side 1.
 */
import { NextResponse } from "next/server";
import { getSideRecord, readChartId, readSide } from "@/lib/machine-players";
import { validateMachineToken } from "@/lib/machineAuth";
import { finishCurrentQueueEntry, type SideResultInput } from "@/lib/queue-server";

function readResult(value: unknown, side: 1 | 2 | null) {
  const result = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const score = Number(result.score);
  const grade = typeof result.grade === "string" ? result.grade.trim() : "";
  const chartId = readChartId(result.chart_id);

  if (side === null) {
    return { error: "side must be 1 or 2" };
  }

  if (!Number.isFinite(score) || score < 0) {
    return { error: "score must be a non-negative decimal value" };
  }

  if (!grade) {
    return { error: "grade must be a non-empty string" };
  }

  if (chartId === null) {
    return { error: "chart_id must be a positive integer" };
  }

  return { result: { side, chartId, score, grade } satisfies SideResultInput };
}

/** Reads `results`, or the legacy top-level result as side 1. */
function readResults(body: Record<string, unknown>) {
  const rawResults = Array.isArray(body.results)
    ? body.results.map((result) => ({ value: result, side: readSide(result?.side) }))
    : [{ value: body, side: 1 as const }];

  if (rawResults.length === 0) {
    return { error: "results must list at least one side" };
  }

  const results: SideResultInput[] = [];

  for (const rawResult of rawResults) {
    const parsed = readResult(rawResult.value, rawResult.side);

    if ("error" in parsed) {
      return { error: parsed.error };
    }

    if (results.some((result) => result.side === parsed.result.side)) {
      return { error: "results must list each side once" };
    }

    results.push(parsed.result);
  }

  return { results };
}

export async function POST(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const isTest = body.test === true;
  const queueItemId = Number(body.queue_item_id);
  const parsedResults = readResults(body);

  if ("error" in parsedResults) {
    return NextResponse.json({ error: parsedResults.error }, { status: 400 });
  }

  if (!Number.isInteger(queueItemId) || queueItemId <= 0) {
    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: body.queue_item_id ?? null,
    });

    return NextResponse.json(
      { error: "queue_item_id must be a positive integer" },
      { status: 400 },
    );
  }

  const { results } = parsedResults;
  const consumed = await finishCurrentQueueEntry({
    results,
    isTest,
    expectedQueueEntryId: queueItemId,
  });

  if (consumed.status === "finished") {
    const { removed } = consumed;
    const recordedResults = await Promise.all(
      consumed.recordedSides.map((recordedSide) =>
        getSideRecord(removed.song.id, {
          side: recordedSide.side,
          user: recordedSide.user,
          chart: recordedSide.playedChart,
        }),
      ),
    );
    const sideOneResult = recordedResults.find((result) => result.side === 1) ?? null;

    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 200,
      hasSong: true,
      finishedSongPath: removed.song.filePath,
      queueEntryId: removed.id,
      reportedSides: results.map((result) => result.side),
      recorded: consumed.recordedSides.map((recordedSide) => ({
        side: recordedSide.side,
        playerId: recordedSide.user.id,
        chartId: recordedSide.playedChart.id,
      })),
      nextSongPath: consumed.next?.song.filePath ?? null,
      isTest,
    });

    return NextResponse.json({
      recorded: recordedResults.length > 0,
      queue_item_id: removed.id,
      user_highscore: sideOneResult?.user_highscore ?? null,
      server_highscore: sideOneResult?.server_highscore ?? null,
      results: recordedResults,
      next_song: consumed.next
        ? {
            queue_item_id: consumed.next.id,
            file_path: consumed.next.song.filePath,
            difficulty_name: consumed.next.chart.difficultySlot,
          }
        : null,
    });
  }

  if (consumed.status === "invalid_chart") {
    console.info("[machine] game.song.finish", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 400,
      hasSong: true,
      expectedQueueItemId: queueItemId,
      actualQueueItemId: consumed.current.id,
      actualSongPath: consumed.current.song.filePath,
      chartId: consumed.chartId,
    });

    return NextResponse.json(
      { error: "chart_id does not match an available chart for the queued song and mode" },
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
  });

  return NextResponse.json({ error: "No current song set" }, { status: 400 });
}
