// curl http://localhost:3000/api/game/song/current
// curl http://localhost:3000/api/game/song/current \
//   -H "Authorization: Bearer {your_token}"

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateMachineToken } from "@/lib/machineAuth";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settingKeys";

type HighScore = {
  score: number;
  grade: string;
};

type ServerHighScore = HighScore & {
  held_by: string;
};

async function getUserHighScore(_songPath: string, _userId: number): Promise<HighScore | null> {
  // TODO: Implement against play_history once that table exists.
  void _songPath;
  void _userId;
  return null;
}

async function getServerHighScore(_songPath: string): Promise<ServerHighScore | null> {
  // TODO: Implement against play_history once that table exists.
  void _songPath;
  return null;
}

export async function GET(request: Request) {
  const machineToken = await validateMachineToken(request);

  if (!machineToken) {
    return new NextResponse(null, { status: 401 });
  }

  const songPath = (await getSetting(SETTING_KEYS.CURRENT_SONG_PATH))?.trim() ?? "";

  if (!songPath) {
    console.info("[machine] game.song.current.read", {
      machineTokenId: machineToken.id,
      machineTokenName: machineToken.name,
      status: 204,
      hasSong: false,
    });

    return new NextResponse(null, { status: 204 });
  }

  const [difficulty, currentPlayerId] = await Promise.all([
    getSetting(SETTING_KEYS.CURRENT_SONG_DIFFICULTY),
    getSetting(SETTING_KEYS.CURRENT_PLAYER_ID),
  ]);

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
    player && player.isActive
      ? {
          id: player.id,
          display_name: player.displayName,
        }
      : null;

  const [userHighScore, serverHighScore] = await Promise.all([
    activePlayer ? getUserHighScore(songPath, activePlayer.id) : Promise.resolve(null),
    getServerHighScore(songPath),
  ]);

  console.info("[machine] game.song.current.read", {
    machineTokenId: machineToken.id,
    machineTokenName: machineToken.name,
    status: 200,
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
