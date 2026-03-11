'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { LogOut, Music, Trophy } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import {
  getSongById,
  getPlayerById,
  getDifficultyColor,
  getGradeColor,
  formatRelativeTime,
} from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export function ProfileScreen() {
  const { state, signOut } = useApp()
  const { currentPlayerId, queueEntries, historyEntries } = state

  const currentPlayer = getPlayerById(currentPlayerId)
  const myQueueEntries = queueEntries.filter(
    (entry) => entry.playerId === currentPlayerId
  )
  const myHistoryEntries = historyEntries.filter(
    (entry) => entry.playerId === currentPlayerId
  )

  if (!currentPlayer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
        <h3 className="text-lg font-semibold mb-2">Signed Out</h3>
        <p className="text-sm text-muted-foreground">
          You have been signed out.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
            {currentPlayer.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{currentPlayer.name}</h2>
          {currentPlayer.isAdmin && (
            <Badge variant="secondary" className="mt-1">
              Admin
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Music className="size-4" />
            My Queue ({myQueueEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {myQueueEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No songs in your queue.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {myQueueEntries.map((entry) => {
                const song = getSongById(entry.songId)
                if (!song) return null

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-balance">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        'text-[10px] font-bold shrink-0 ml-2',
                        getDifficultyColor(entry.selectedDifficulty.slot)
                      )}
                    >
                      {entry.selectedDifficulty.slot} {entry.selectedDifficulty.level}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="size-4" />
            My History ({myHistoryEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {myHistoryEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No play history yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {myHistoryEntries.map((entry) => {
                const song = getSongById(entry.songId)
                if (!song) return null

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-balance">{song.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge
                          className={cn(
                            'text-[10px] font-bold h-5',
                            getDifficultyColor(entry.playedDifficulty.slot)
                          )}
                        >
                          {entry.playedDifficulty.level}
                        </Badge>
                        <span>&middot;</span>
                        <span>{formatRelativeTime(entry.completedAt)}</span>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'text-sm font-bold shrink-0 ml-2 min-w-[32px] justify-center',
                        getGradeColor(entry.grade)
                      )}
                    >
                      {entry.grade}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={signOut}
      >
        <LogOut className="size-4 mr-2" />
        Sign Out
      </Button>
    </div>
  )
}
