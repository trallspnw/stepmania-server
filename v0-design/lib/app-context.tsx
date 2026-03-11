'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import {
  QueueEntry,
  HistoryEntry,
  Difficulty,
  initialQueueEntries,
  initialHistoryEntries,
} from './mock-data'

interface AppState {
  currentPlayerId: string
  queueEntries: QueueEntry[]
  historyEntries: HistoryEntry[]
}

type AppAction =
  | { type: 'ADD_TO_QUEUE'; payload: { songId: string; difficulty: Difficulty } }
  | { type: 'REMOVE_FROM_QUEUE'; payload: { entryId: string } }
  | { type: 'SIGN_OUT' }

const initialState: AppState = {
  currentPlayerId: 'jordan',
  queueEntries: initialQueueEntries,
  historyEntries: initialHistoryEntries,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TO_QUEUE': {
      const newEntry: QueueEntry = {
        id: `queue-${Date.now()}`,
        playerId: state.currentPlayerId,
        songId: action.payload.songId,
        selectedDifficulty: action.payload.difficulty,
        status: 'pending',
        addedAt: new Date(),
      }
      return {
        ...state,
        queueEntries: [...state.queueEntries, newEntry],
      }
    }
    case 'REMOVE_FROM_QUEUE': {
      return {
        ...state,
        queueEntries: state.queueEntries.filter(
          (entry) => entry.id !== action.payload.entryId
        ),
      }
    }
    case 'SIGN_OUT': {
      return {
        ...state,
        currentPlayerId: '',
      }
    }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  addToQueue: (songId: string, difficulty: Difficulty) => void
  removeFromQueue: (entryId: string) => void
  signOut: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const addToQueue = (songId: string, difficulty: Difficulty) => {
    dispatch({ type: 'ADD_TO_QUEUE', payload: { songId, difficulty } })
  }

  const removeFromQueue = (entryId: string) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: { entryId } })
  }

  const signOut = () => {
    dispatch({ type: 'SIGN_OUT' })
  }

  return (
    <AppContext.Provider value={{ state, addToQueue, removeFromQueue, signOut }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
