'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useApp } from '@/lib/app-context'
import {
  getSongById,
  getPlayerById,
  getGradeColor,
  getDifficultyColor,
  formatRelativeTime,
} from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

export function HistoryScreen() {
  const { state } = useApp()
  const { historyEntries } = state

  if (historyEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Clock className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No Play History</h3>
        <p className="text-sm text-muted-foreground">
          Completed songs will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {historyEntries.map((entry) => {
        const song = getSongById(entry.songId)
        const player = getPlayerById(entry.playerId)

        if (!song || !player) return null

        return (
          <Card key={entry.id} className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 bg-muted shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                    {player.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground truncate text-balance">
                    {song.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{player.name}</span>
                    <span>&middot;</span>
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
                    'text-sm font-bold shrink-0 min-w-[32px] justify-center',
                    getGradeColor(entry.grade)
                  )}
                >
                  {entry.grade}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
