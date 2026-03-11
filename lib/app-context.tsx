"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useReducer,
} from "react";
import {
  Difficulty,
  HistoryEntry,
  initialHistoryEntries,
  initialQueueEntries,
  QueueEntry,
} from "@/lib/mock-data";

interface AppState {
  currentPlayerId: string;
  queueEntries: QueueEntry[];
  historyEntries: HistoryEntry[];
}

type AppAction =
  | { type: "ADD_TO_QUEUE"; payload: { songId: string; difficulty: Difficulty } }
  | { type: "REMOVE_FROM_QUEUE"; payload: { entryId: string } }
  | { type: "SIGN_OUT" };

const initialState: AppState = {
  currentPlayerId: "jordan",
  queueEntries: initialQueueEntries,
  historyEntries: initialHistoryEntries,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ADD_TO_QUEUE":
      return {
        ...state,
        queueEntries: [
          ...state.queueEntries,
          {
            id: `queue-${Date.now()}`,
            playerId: state.currentPlayerId,
            songId: action.payload.songId,
            selectedDifficulty: action.payload.difficulty,
            status: "pending",
            addedAt: new Date(),
          },
        ],
      };
    case "REMOVE_FROM_QUEUE":
      return {
        ...state,
        queueEntries: state.queueEntries.filter(
          (entry) => entry.id !== action.payload.entryId,
        ),
      };
    case "SIGN_OUT":
      return {
        ...state,
        currentPlayerId: "",
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  addToQueue: (songId: string, difficulty: Difficulty) => void;
  removeFromQueue: (entryId: string) => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider
      value={{
        state,
        addToQueue: (songId, difficulty) =>
          dispatch({ type: "ADD_TO_QUEUE", payload: { songId, difficulty } }),
        removeFromQueue: (entryId) =>
          dispatch({ type: "REMOVE_FROM_QUEUE", payload: { entryId } }),
        signOut: () => dispatch({ type: "SIGN_OUT" }),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
