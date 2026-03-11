'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Music } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import {
  getSongById,
  getPlayerById,
  getDifficultyColor,
} from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export function QueueScreen() {
  const { state, removeFromQueue } = useApp()
  const { queueEntries, currentPlayerId } = state

  if (queueEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Music className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Queue is Empty</h3>
        <p className="text-sm text-muted-foreground">
          Browse songs and add them to the queue to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {queueEntries.map((entry, index) => {
        const song = getSongById(entry.songId)
        const player = getPlayerById(entry.playerId)
        const isPlaying = entry.status === 'playing'
        const isOwn = entry.playerId === currentPlayerId

        if (!song || !player) return null

        return (
          <Card
            key={entry.id}
            className={cn(
              'relative overflow-hidden transition-all border-border',
              isPlaying && 'ring-2 ring-emerald-500/50 border-emerald-500/50'
            )}
          >
            {isPlaying && (
              <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
            )}
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{index + 1}
                    </span>
                    {isPlaying && (
                      <div className="relative">
                        <span className="flex size-2.5 rounded-full bg-emerald-500" />
                        <span className="absolute inset-0 size-2.5 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isPlaying && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-[10px] uppercase tracking-wider"
                        >
                          Now Playing
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate text-balance">
                      {song.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={cn(
                          'text-[10px] font-bold',
                          getDifficultyColor(entry.selectedDifficulty.slot)
                        )}
                      >
                        {entry.selectedDifficulty.slot} {entry.selectedDifficulty.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        by {player.name}
                      </span>
                    </div>
                  </div>
                </div>
                {isOwn && !isPlaying && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeFromQueue(entry.id)}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Remove from queue</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
