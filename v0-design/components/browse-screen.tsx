'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Search,
  Plus,
  Check,
  ChevronRight,
  ChevronDown,
  Folder,
  Music,
  User,
  Filter,
  X,
  ArrowLeft,
} from 'lucide-react'
import {
  songs,
  Song,
  Difficulty,
  getDifficultyColor,
  getDifficultyRange,
  getUniquePacks,
  getUniqueArtists,
} from '@/lib/mock-data'
import { useApp } from '@/lib/app-context'
import { cn } from '@/lib/utils'

type BrowseMode = 'search' | 'packs' | 'artists'
type FolderView = { type: 'pack' | 'artist'; value: string } | null

interface Filters {
  minDifficulty: number
  maxDifficulty: number
  minBpm: number
  maxBpm: number
}

const defaultFilters: Filters = {
  minDifficulty: 1,
  maxDifficulty: 25,
  minBpm: 100,
  maxBpm: 450,
}

export function BrowseScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [browseMode, setBrowseMode] = useState<BrowseMode>('search')
  const [folderView, setFolderView] = useState<FolderView>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const { addToQueue } = useApp()

  const packs = getUniquePacks()
  const artists = getUniqueArtists()

  const hasActiveFilters =
    filters.minDifficulty !== defaultFilters.minDifficulty ||
    filters.maxDifficulty !== defaultFilters.maxDifficulty ||
    filters.minBpm !== defaultFilters.minBpm ||
    filters.maxBpm !== defaultFilters.maxBpm

  const applyFilters = (songList: Song[]) => {
    return songList.filter((song) => {
      const { min, max } = getDifficultyRange(song)
      const hasDifficultyInRange =
        min <= filters.maxDifficulty && max >= filters.minDifficulty
      const bpmInRange = song.bpm >= filters.minBpm && song.bpm <= filters.maxBpm
      return hasDifficultyInRange && bpmInRange
    })
  }

  const filteredSongs = useMemo(() => {
    let result = songs

    if (folderView) {
      if (folderView.type === 'pack') {
        result = songs.filter((s) => s.pack === folderView.value)
      } else {
        result = songs.filter((s) => s.artist === folderView.value)
      }
    } else if (browseMode === 'search' && searchQuery) {
      result = songs.filter(
        (song) =>
          song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.pack.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return applyFilters(result)
  }, [searchQuery, browseMode, folderView, filters])

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song)
    setSelectedDifficulty(song.difficulties[0])
  }

  const handleAddToQueue = () => {
    if (!selectedSong || !selectedDifficulty) return
    addToQueue(selectedSong.id, selectedDifficulty)
    setJustAdded(selectedSong.id)
    setTimeout(() => {
      setJustAdded(null)
      setSelectedSong(null)
      setSelectedDifficulty(null)
    }, 1000)
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const renderFolderList = () => {
    const items = browseMode === 'packs' ? packs : artists
    const icon = browseMode === 'packs' ? Folder : User

    return (
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const count = songs.filter((s) =>
            browseMode === 'packs' ? s.pack === item : s.artist === item
          ).length
          const Icon = icon
          return (
            <button
              key={item}
              onClick={() =>
                setFolderView({
                  type: browseMode === 'packs' ? 'pack' : 'artist',
                  value: item,
                })
              }
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item}</p>
                <p className="text-sm text-muted-foreground">
                  {count} song{count !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          )
        })}
      </div>
    )
  }

  const renderSongList = (songList: Song[]) => {
    if (songList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No songs found
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {songList.map((song) => {
          const { min, max } = getDifficultyRange(song)
          return (
            <Card
              key={song.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors border-border"
              onClick={() => handleSelectSong(song)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate text-balance">
                      {song.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        {song.pack}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {song.bpm} BPM
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold shrink-0">
                    {min === max ? min : `${min}-${max}`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {folderView ? (
        <div className="flex items-center gap-2 sticky top-0 z-10 bg-background pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFolderView(null)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{folderView.value}</h2>
            <p className="text-sm text-muted-foreground">
              {filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant={hasActiveFilters ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="relative"
          >
            <Filter className="size-5" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 size-2 bg-primary rounded-full" />
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 sticky top-0 z-10 bg-background pb-2">
            <Button
              variant={browseMode === 'search' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setBrowseMode('search')}
              className="gap-1.5"
            >
              <Search className="size-4" />
              Search
            </Button>
            <Button
              variant={browseMode === 'packs' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setBrowseMode('packs')}
              className="gap-1.5"
            >
              <Folder className="size-4" />
              Packs
            </Button>
            <Button
              variant={browseMode === 'artists' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setBrowseMode('artists')}
              className="gap-1.5"
            >
              <User className="size-4" />
              Artists
            </Button>
            <div className="flex-1" />
            <Button
              variant={hasActiveFilters ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="relative shrink-0"
            >
              <Filter className="size-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 size-2 bg-primary rounded-full" />
              )}
            </Button>
          </div>

          {browseMode === 'search' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search songs, artists, or packs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
              />
            </div>
          )}
        </>
      )}

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="mb-4">
            <CardContent className="p-4 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground h-auto py-1 px-2"
                  >
                    <X className="size-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Difficulty Range</Label>
                  <span className="text-sm text-muted-foreground">
                    {filters.minDifficulty} - {filters.maxDifficulty}
                  </span>
                </div>
                <Slider
                  value={[filters.minDifficulty, filters.maxDifficulty]}
                  min={1}
                  max={25}
                  step={1}
                  onValueChange={([min, max]) =>
                    setFilters((f) => ({
                      ...f,
                      minDifficulty: min,
                      maxDifficulty: max,
                    }))
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">BPM Range</Label>
                  <span className="text-sm text-muted-foreground">
                    {filters.minBpm} - {filters.maxBpm}
                  </span>
                </div>
                <Slider
                  value={[filters.minBpm, filters.maxBpm]}
                  min={100}
                  max={450}
                  step={5}
                  onValueChange={([min, max]) =>
                    setFilters((f) => ({ ...f, minBpm: min, maxBpm: max }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {browseMode === 'search' || folderView
        ? renderSongList(filteredSongs)
        : renderFolderList()}

      <Sheet
        open={!!selectedSong}
        onOpenChange={() => {
          setSelectedSong(null)
          setSelectedDifficulty(null)
        }}
      >
        <SheetContent side="bottom" className="rounded-t-xl">
          {selectedSong && (
            <>
              <SheetHeader className="pb-2">
                <SheetTitle className="text-xl text-balance">
                  {selectedSong.title}
                </SheetTitle>
                <SheetDescription>{selectedSong.artist}</SheetDescription>
              </SheetHeader>

              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">Pack</span>
                    <span className="font-medium">{selectedSong.pack}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">BPM</span>
                    <span className="font-medium">{selectedSong.bpm}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Select Difficulty</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedSong.difficulties.map((diff) => (
                      <button
                        key={diff.slot}
                        onClick={() => setSelectedDifficulty(diff)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          'border-2',
                          selectedDifficulty?.slot === diff.slot
                            ? 'border-foreground ring-2 ring-foreground/20'
                            : 'border-transparent',
                          getDifficultyColor(diff.slot)
                        )}
                      >
                        {diff.slot} {diff.level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToQueue}
                  disabled={
                    justAdded === selectedSong.id || !selectedDifficulty
                  }
                >
                  {justAdded === selectedSong.id ? (
                    <>
                      <Check className="size-4 mr-2" />
                      Added to Queue
                    </>
                  ) : (
                    <>
                      <Plus className="size-4 mr-2" />
                      Add to Queue
                    </>
                  )}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
