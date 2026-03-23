"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useReducer,
  useState,
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

interface CurrentUser {
  displayName: string;
  isAdmin: boolean;
}

interface QueueSongSnapshot {
  title: string;
  artist: string;
}

type AppAction =
  | {
      type: "ADD_TO_QUEUE";
      payload: { songId: string; difficulty: Difficulty; songSnapshot?: QueueSongSnapshot };
    }
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
            songSnapshot: action.payload.songSnapshot,
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
  currentUser: CurrentUser;
  setCurrentUser: (currentUser: CurrentUser) => void;
  addToQueue: (songId: string, difficulty: Difficulty, songSnapshot?: QueueSongSnapshot) => void;
  removeFromQueue: (entryId: string) => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: CurrentUser;
}) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [currentUserState, setCurrentUserState] = useState(currentUser);

  return (
    <AppContext.Provider
      value={{
        state,
        currentUser: currentUserState,
        setCurrentUser: setCurrentUserState,
        addToQueue: (songId, difficulty, songSnapshot) =>
          dispatch({ type: "ADD_TO_QUEUE", payload: { songId, difficulty, songSnapshot } }),
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
