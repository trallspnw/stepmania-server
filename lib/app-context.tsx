"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { HistoryEntry, initialHistoryEntries } from "@/lib/mock-data";
import type { QueueEntryRecord, QueueResponse } from "@/lib/queue-types";

const QUEUE_POLL_INTERVAL_MS = 5000;

interface AppState {
  currentPlayerId: string;
  historyEntries: HistoryEntry[];
}

interface CurrentUser {
  id: number;
  displayName: string;
  isAdmin: boolean;
}

type AppAction = { type: "SIGN_OUT" };

const initialState: AppState = {
  currentPlayerId: "jordan",
  historyEntries: initialHistoryEntries,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
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
  queueEntries: QueueEntryRecord[];
  queueLoading: boolean;
  queueError: string | null;
  refreshQueue: () => Promise<void>;
  addToQueue: (songId: number, chartId: number) => Promise<boolean>;
  removeFromQueue: (entryId: number) => Promise<boolean>;
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
  const [queueEntries, setQueueEntries] = useState<QueueEntryRecord[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const queueRefreshInFlightRef = useRef(false);

  async function refreshQueue(options?: { silent?: boolean }) {
    if (queueRefreshInFlightRef.current) {
      return;
    }

    queueRefreshInFlightRef.current = true;

    if (!options?.silent) {
      setQueueLoading(true);
    }

    try {
      const response = await fetch("/api/queue", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to load queue.");
      }

      const data = (await response.json()) as QueueResponse;
      setQueueEntries(data.entries);
      setQueueError(null);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Failed to load queue.");
    } finally {
      queueRefreshInFlightRef.current = false;

      if (!options?.silent) {
        setQueueLoading(false);
      }
    }
  }

  useEffect(() => {
    void refreshQueue();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshQueue({ silent: true });
    }, QUEUE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const contextValue = useMemo<AppContextValue>(
    () => ({
      state,
      currentUser: currentUserState,
      setCurrentUser: setCurrentUserState,
      queueEntries,
      queueLoading,
      queueError,
      refreshQueue,
      addToQueue: async (songId, chartId) => {
        const response = await fetch("/api/queue", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ songId, chartId }),
        });

        if (!response.ok) {
          return false;
        }

        const data = (await response.json()) as QueueResponse;
        setQueueEntries(data.entries);
        setQueueError(null);
        return true;
      },
      removeFromQueue: async (entryId) => {
        const response = await fetch(`/api/queue/${entryId}`, {
          method: "DELETE",
          credentials: "same-origin",
        });

        if (!response.ok) {
          return false;
        }

        const data = (await response.json()) as QueueResponse;
        setQueueEntries(data.entries);
        setQueueError(null);
        return true;
      },
      signOut: () => dispatch({ type: "SIGN_OUT" }),
    }),
    [currentUserState, queueEntries, queueError, queueLoading, state],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
}
