export type DifficultySlot = 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Expert'
export type Grade = 'S' | 'A' | 'B' | 'C'
export type QueueStatus = 'playing' | 'pending'

export interface Player {
  id: string
  name: string
  isAdmin: boolean
}

export interface Difficulty {
  slot: DifficultySlot
  level: number
}

export interface Song {
  id: string
  title: string
  artist: string
  pack: string
  bpm: number
  difficulties: Difficulty[]
}

export interface QueueEntry {
  id: string
  playerId: string
  songId: string
  selectedDifficulty: Difficulty
  status: QueueStatus
  addedAt: Date
}

export interface HistoryEntry {
  id: string
  playerId: string
  songId: string
  playedDifficulty: Difficulty
  grade: Grade
  completedAt: Date
}

export const players: Player[] = [
  { id: 'alex', name: 'Alex', isAdmin: false },
  { id: 'jordan', name: 'Jordan', isAdmin: false },
  { id: 'sam', name: 'Sam', isAdmin: false },
  { id: 'taylor', name: 'Taylor', isAdmin: true },
]

export const songs: Song[] = [
  {
    id: 'song-1',
    title: 'MAX 300',
    artist: 'Ω',
    pack: 'DDRMAX',
    bpm: 300,
    difficulties: [
      { slot: 'Beginner', level: 5 },
      { slot: 'Easy', level: 8 },
      { slot: 'Medium', level: 12 },
      { slot: 'Hard', level: 15 },
      { slot: 'Expert', level: 18 },
    ],
  },
  {
    id: 'song-2',
    title: 'Pluto Relinquish',
    artist: 'Black Rose Garden',
    pack: 'In The Groove 2',
    bpm: 200,
    difficulties: [
      { slot: 'Easy', level: 10 },
      { slot: 'Medium', level: 15 },
      { slot: 'Hard', level: 20 },
      { slot: 'Expert', level: 24 },
    ],
  },
  {
    id: 'song-3',
    title: 'Butterfly',
    artist: 'smile.dk',
    pack: 'DDR 3rdMIX',
    bpm: 135,
    difficulties: [
      { slot: 'Beginner', level: 1 },
      { slot: 'Easy', level: 3 },
      { slot: 'Medium', level: 6 },
      { slot: 'Hard', level: 8 },
    ],
  },
  {
    id: 'song-4',
    title: 'Sakura',
    artist: 'RevenG',
    pack: 'DDR Extreme',
    bpm: 180,
    difficulties: [
      { slot: 'Beginner', level: 3 },
      { slot: 'Easy', level: 6 },
      { slot: 'Medium', level: 9 },
      { slot: 'Hard', level: 12 },
      { slot: 'Expert', level: 14 },
    ],
  },
  {
    id: 'song-5',
    title: 'Fascination MAXX',
    artist: '100-200-400',
    pack: 'DDR SuperNOVA',
    bpm: 400,
    difficulties: [
      { slot: 'Medium', level: 14 },
      { slot: 'Hard', level: 18 },
      { slot: 'Expert', level: 22 },
    ],
  },
  {
    id: 'song-6',
    title: 'Tribal Style',
    artist: 'Kevyn Lettau',
    pack: 'DDR 4thMIX',
    bpm: 145,
    difficulties: [
      { slot: 'Beginner', level: 1 },
      { slot: 'Easy', level: 2 },
      { slot: 'Medium', level: 4 },
      { slot: 'Hard', level: 6 },
    ],
  },
  {
    id: 'song-7',
    title: 'Night of Fire',
    artist: 'NIKO',
    pack: 'Eurobeat Pack',
    bpm: 155,
    difficulties: [
      { slot: 'Beginner', level: 2 },
      { slot: 'Easy', level: 5 },
      { slot: 'Medium', level: 9 },
      { slot: 'Hard', level: 11 },
      { slot: 'Expert', level: 13 },
    ],
  },
  {
    id: 'song-8',
    title: 'Tsugaru',
    artist: 'RevenG vs De-Sire',
    pack: 'DDR Extreme',
    bpm: 157,
    difficulties: [
      { slot: 'Easy', level: 6 },
      { slot: 'Medium', level: 10 },
      { slot: 'Hard', level: 14 },
      { slot: 'Expert', level: 16 },
    ],
  },
  {
    id: 'song-9',
    title: 'Speed Over Beethoven',
    artist: 'Rose',
    pack: 'DDR Extreme',
    bpm: 170,
    difficulties: [
      { slot: 'Beginner', level: 3 },
      { slot: 'Easy', level: 5 },
      { slot: 'Medium', level: 8 },
      { slot: 'Hard', level: 11 },
      { slot: 'Expert', level: 13 },
    ],
  },
  {
    id: 'song-10',
    title: 'Paranoia Survivor',
    artist: '270',
    pack: 'DDR Extreme',
    bpm: 270,
    difficulties: [
      { slot: 'Easy', level: 7 },
      { slot: 'Medium', level: 11 },
      { slot: 'Hard', level: 14 },
      { slot: 'Expert', level: 16 },
    ],
  },
  {
    id: 'song-11',
    title: 'Cartoon Heroes',
    artist: 'Aqua',
    pack: 'Novelty Pack',
    bpm: 130,
    difficulties: [
      { slot: 'Beginner', level: 1 },
      { slot: 'Easy', level: 3 },
      { slot: 'Medium', level: 5 },
      { slot: 'Hard', level: 7 },
    ],
  },
  {
    id: 'song-12',
    title: 'Sandstorm',
    artist: 'Darude',
    pack: 'EDM Classics',
    bpm: 136,
    difficulties: [
      { slot: 'Beginner', level: 2 },
      { slot: 'Easy', level: 4 },
      { slot: 'Medium', level: 8 },
      { slot: 'Hard', level: 10 },
      { slot: 'Expert', level: 12 },
    ],
  },
  {
    id: 'song-13',
    title: 'Final Jason',
    artist: 'DJ Mass MAD Izm*',
    pack: 'J-Core Collection',
    bpm: 190,
    difficulties: [
      { slot: 'Medium', level: 12 },
      { slot: 'Hard', level: 17 },
      { slot: 'Expert', level: 20 },
    ],
  },
  {
    id: 'song-14',
    title: 'Space Station Q',
    artist: 'Tatsh',
    pack: 'J-Core Collection',
    bpm: 165,
    difficulties: [
      { slot: 'Easy', level: 7 },
      { slot: 'Medium', level: 11 },
      { slot: 'Hard', level: 15 },
      { slot: 'Expert', level: 17 },
    ],
  },
  {
    id: 'song-15',
    title: 'Daft Punk Medley',
    artist: 'Various Artists',
    pack: 'EDM Classics',
    bpm: 128,
    difficulties: [
      { slot: 'Beginner', level: 2 },
      { slot: 'Easy', level: 4 },
      { slot: 'Medium', level: 7 },
      { slot: 'Hard', level: 9 },
    ],
  },
  {
    id: 'song-16',
    title: 'Running in the 90s',
    artist: 'Max Coveri',
    pack: 'Eurobeat Pack',
    bpm: 162,
    difficulties: [
      { slot: 'Beginner', level: 2 },
      { slot: 'Easy', level: 5 },
      { slot: 'Medium', level: 8 },
      { slot: 'Hard', level: 11 },
      { slot: 'Expert', level: 14 },
    ],
  },
  {
    id: 'song-17',
    title: 'Gas Gas Gas',
    artist: 'Manuel',
    pack: 'Eurobeat Pack',
    bpm: 155,
    difficulties: [
      { slot: 'Beginner', level: 2 },
      { slot: 'Easy', level: 4 },
      { slot: 'Medium', level: 7 },
      { slot: 'Hard', level: 10 },
      { slot: 'Expert', level: 13 },
    ],
  },
  {
    id: 'song-18',
    title: 'Afronova',
    artist: 'RE-VENGE',
    pack: 'DDR 3rdMIX',
    bpm: 200,
    difficulties: [
      { slot: 'Easy', level: 6 },
      { slot: 'Medium', level: 9 },
      { slot: 'Hard', level: 12 },
      { slot: 'Expert', level: 15 },
    ],
  },
]

export const initialQueueEntries: QueueEntry[] = [
  {
    id: 'queue-1',
    playerId: 'alex',
    songId: 'song-3',
    selectedDifficulty: { slot: 'Medium', level: 6 },
    status: 'playing',
    addedAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'queue-2',
    playerId: 'jordan',
    songId: 'song-7',
    selectedDifficulty: { slot: 'Hard', level: 11 },
    status: 'pending',
    addedAt: new Date(Date.now() - 1000 * 60 * 4),
  },
  {
    id: 'queue-3',
    playerId: 'sam',
    songId: 'song-4',
    selectedDifficulty: { slot: 'Expert', level: 14 },
    status: 'pending',
    addedAt: new Date(Date.now() - 1000 * 60 * 3),
  },
  {
    id: 'queue-4',
    playerId: 'taylor',
    songId: 'song-10',
    selectedDifficulty: { slot: 'Expert', level: 16 },
    status: 'pending',
    addedAt: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: 'queue-5',
    playerId: 'alex',
    songId: 'song-13',
    selectedDifficulty: { slot: 'Expert', level: 20 },
    status: 'pending',
    addedAt: new Date(Date.now() - 1000 * 60 * 1),
  },
]

export const initialHistoryEntries: HistoryEntry[] = [
  {
    id: 'history-1',
    playerId: 'jordan',
    songId: 'song-11',
    playedDifficulty: { slot: 'Medium', level: 5 },
    grade: 'S',
    completedAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'history-2',
    playerId: 'alex',
    songId: 'song-12',
    playedDifficulty: { slot: 'Hard', level: 10 },
    grade: 'A',
    completedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 'history-3',
    playerId: 'sam',
    songId: 'song-6',
    playedDifficulty: { slot: 'Easy', level: 2 },
    grade: 'S',
    completedAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: 'history-4',
    playerId: 'taylor',
    songId: 'song-2',
    playedDifficulty: { slot: 'Expert', level: 24 },
    grade: 'B',
    completedAt: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: 'history-5',
    playerId: 'jordan',
    songId: 'song-8',
    playedDifficulty: { slot: 'Hard', level: 14 },
    grade: 'A',
    completedAt: new Date(Date.now() - 1000 * 60 * 180),
  },
  {
    id: 'history-6',
    playerId: 'alex',
    songId: 'song-5',
    playedDifficulty: { slot: 'Expert', level: 22 },
    grade: 'C',
    completedAt: new Date(Date.now() - 1000 * 60 * 240),
  },
  {
    id: 'history-7',
    playerId: 'sam',
    songId: 'song-9',
    playedDifficulty: { slot: 'Medium', level: 8 },
    grade: 'A',
    completedAt: new Date(Date.now() - 1000 * 60 * 300),
  },
  {
    id: 'history-8',
    playerId: 'taylor',
    songId: 'song-1',
    playedDifficulty: { slot: 'Expert', level: 18 },
    grade: 'S',
    completedAt: new Date(Date.now() - 1000 * 60 * 360),
  },
]

export function getSongById(id: string): Song | undefined {
  return songs.find((song) => song.id === id)
}

export function getPlayerById(id: string): Player | undefined {
  return players.find((player) => player.id === id)
}

export function getDifficultyRange(song: Song): { min: number; max: number } {
  const levels = song.difficulties.map((d) => d.level)
  return { min: Math.min(...levels), max: Math.max(...levels) }
}

export function getUniquePacks(): string[] {
  return [...new Set(songs.map((s) => s.pack))].sort()
}

export function getUniqueArtists(): string[] {
  return [...new Set(songs.map((s) => s.artist))].sort()
}

export function getDifficultyColor(slot: DifficultySlot): string {
  switch (slot) {
    case 'Beginner':
      return 'bg-emerald-500 text-white'
    case 'Easy':
      return 'bg-sky-500 text-white'
    case 'Medium':
      return 'bg-amber-500 text-white'
    case 'Hard':
      return 'bg-rose-500 text-white'
    case 'Expert':
      return 'bg-purple-500 text-white'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case 'S':
      return 'bg-yellow-500 text-yellow-950'
    case 'A':
      return 'bg-emerald-500 text-white'
    case 'B':
      return 'bg-sky-500 text-white'
    case 'C':
      return 'bg-zinc-500 text-white'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}
