// curl http://localhost:3000/api/game/song/current
// curl http://localhost:3000/api/game/song/current \
//   -H "Authorization: Bearer {your_token}"

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateMachineToken } from "@/lib/machineAuth";
import {
  getServerHighScore,
  getUserHighScore,
  resolveSongChartByPath,
} from "@/lib/play-history";
import { getCurrentQueueEntry } from "@/lib/queue-server";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

export async function GET(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return new NextResponse(null, { status: 401 });
  }

  const currentQueueEntry = await getCurrentQueueEntry();
  const songPath =
    currentQueueEntry?.song.filePath ??
    ((await getSetting(SETTING_KEYS.CURRENT_SONG_PATH))?.trim() ?? "");

  if (!songPath) {
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
    });
  }

  const [fallbackDifficulty, fallbackPlayerId] = await Promise.all([
    getSetting(SETTING_KEYS.CURRENT_SONG_DIFFICULTY),
    getSetting(SETTING_KEYS.CURRENT_PLAYER_ID),
  ]);

  const difficulty = currentQueueEntry?.chart.difficultySlot ?? fallbackDifficulty;
  const currentPlayerId = currentQueueEntry ? String(currentQueueEntry.user.id) : fallbackPlayerId;

  const parsedPlayerId = currentPlayerId ? Number.parseInt(currentPlayerId, 10) : null;
  const player =
    parsedPlayerId && Number.isInteger(parsedPlayerId)
      ? await prisma.user.findUnique({
          where: { id: parsedPlayerId },
          select: {
            id: true,
            displayName: true,
            isActive: true,
          },
        })
      : null;

  const activePlayer =
    currentQueueEntry
      ? {
          id: currentQueueEntry.user.id,
          display_name: currentQueueEntry.user.displayName,
        }
      : player && player.isActive
      ? {
          id: player.id,
          display_name: player.displayName,
        }
      : null;

  const resolvedSongChart =
    currentQueueEntry
      ? {
          songId: currentQueueEntry.song.id,
          chartId: currentQueueEntry.chart.id,
        }
      : await resolveSongChartByPath({
          filePath: songPath,
          difficultyName: difficulty,
        });

  const [userHighScore, serverHighScore] = await Promise.all([
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
  ]);

  console.info("[machine] game.song.current.read", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
    hasSong: true,
    songPath,
    difficulty,
    playerId: activePlayer?.id ?? null,
  });

  return NextResponse.json({
    song: {
      file_path: songPath,
      difficulty_name: difficulty,
    },
    player: activePlayer,
    user_highscore: userHighScore,
    server_highscore: serverHighScore,
  });
}
