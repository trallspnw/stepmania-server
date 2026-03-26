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
import type { HistoryRecord, HistoryResponse } from "@/lib/history-types";
import type { QueueEntryRecord, QueueResponse } from "@/lib/queue-types";

const QUEUE_POLL_INTERVAL_MS = 5000;
const HISTORY_POLL_INTERVAL_MS = 5000;

interface CurrentUser {
  id: number;
  displayName: string;
  isAdmin: boolean;
}

type AppAction = { type: "SIGN_OUT" };

function appReducer(state: null, _action: AppAction) {
  return state;
}

interface AppContextValue {
  currentUser: CurrentUser;
  setCurrentUser: (currentUser: CurrentUser) => void;
  queueEntries: QueueEntryRecord[];
  queueLoading: boolean;
  queueError: string | null;
  historyEntries: HistoryRecord[];
  historyLoading: boolean;
  historyError: string | null;
  refreshQueue: (options?: { silent?: boolean }) => Promise<void>;
  refreshHistory: (options?: { silent?: boolean }) => Promise<void>;
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
  const [, dispatch] = useReducer(appReducer, null);
  const [currentUserState, setCurrentUserState] = useState(currentUser);
  const [queueEntries, setQueueEntries] = useState<QueueEntryRecord[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const queueRefreshInFlightRef = useRef(false);
  const historyRefreshInFlightRef = useRef(false);

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

  async function refreshHistory(options?: { silent?: boolean }) {
    if (historyRefreshInFlightRef.current) {
      return;
    }

    historyRefreshInFlightRef.current = true;

    if (!options?.silent) {
      setHistoryLoading(true);
    }

    try {
      const response = await fetch("/api/history", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to load history.");
      }

      const data = (await response.json()) as HistoryResponse;
      setHistoryEntries(data.entries);
      setHistoryError(null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to load history.");
    } finally {
      historyRefreshInFlightRef.current = false;

      if (!options?.silent) {
        setHistoryLoading(false);
      }
    }
  }

  useEffect(() => {
    void refreshQueue();
    void refreshHistory();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshQueue({ silent: true });
    }, QUEUE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshHistory({ silent: true });
    }, HISTORY_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const contextValue = useMemo<AppContextValue>(
    () => ({
      currentUser: currentUserState,
      setCurrentUser: setCurrentUserState,
      queueEntries,
      queueLoading,
      queueError,
      historyEntries,
      historyLoading,
      historyError,
      refreshQueue,
      refreshHistory,
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
    [
      currentUserState,
      historyEntries,
      historyError,
      historyLoading,
      queueEntries,
      queueError,
      queueLoading,
    ],
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
