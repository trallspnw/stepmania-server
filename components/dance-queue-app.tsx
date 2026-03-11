"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import styles from "@/components/dance-queue-app.module.css";
import { BottomNav, Tab } from "@/components/bottom-nav";
import { BrowseScreen } from "@/components/browse-screen";
import { HistoryScreen } from "@/components/history-screen";
import {
  HistoryIcon,
  QueueIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { ProfileScreen } from "@/components/profile-screen";
import { QueueScreen } from "@/components/queue-screen";
import { AppProvider, useApp } from "@/lib/app-context";

interface DanceQueueAppProps {
  currentUser: {
    displayName: string;
    isAdmin: boolean;
  };
}

const tabMeta = {
  queue: { title: "Queue", Icon: QueueIcon },
  browse: { title: "Browse", Icon: SearchIcon },
  history: { title: "History", Icon: HistoryIcon },
  profile: { title: "Profile", Icon: UserIcon },
} satisfies Record<Tab, { title: string; Icon: React.ElementType }>;

function AppFrame() {
  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const { title, Icon } = tabMeta[activeTab];
  const { currentUser, setCurrentUser } = useApp();
  const signingOutRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSessionState() {
      const response = await fetch("/api/session-state", { cache: "no-store" });

      if (!response.ok) {
        if (!cancelled && !signingOutRef.current) {
          signingOutRef.current = true;
          await signOut({ callbackUrl: "/login" });
        }
        return;
      }

      const data = (await response.json()) as {
        authenticated: boolean;
        user?: {
          displayName: string;
          isAdmin: boolean;
          isActive: boolean;
        };
      };

      if (!data.authenticated || !data.user?.isActive) {
        if (!cancelled && !signingOutRef.current) {
          signingOutRef.current = true;
          await signOut({ callbackUrl: "/login" });
        }
        return;
      }

      if (!cancelled) {
        setCurrentUser({
          displayName: data.user.displayName,
          isAdmin: data.user.isAdmin,
        });
      }
    }

    void checkSessionState();
    const interval = window.setInterval(() => {
      void checkSessionState();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [setCurrentUser]);

  return (
    <div className={styles.root}>
      <div className="appCanvas">
        <div className="appShell">
          <header className="topBar">
            <div className="topBarInner">
              <div className="topBarTitle">
                <Icon className="sectionIcon accentIcon" />
                <div>
                  <p className="topBarLabel">StepMania Server</p>
                  <h1>{title}</h1>
                </div>
              </div>
              {currentUser.isAdmin ? (
                <Link className="headerAction" href="/admin">
                  Admin
                </Link>
              ) : null}
            </div>
          </header>

          <main className="screenBody">
            {activeTab === "queue" ? <QueueScreen /> : null}
            {activeTab === "browse" ? <BrowseScreen /> : null}
            {activeTab === "history" ? <HistoryScreen /> : null}
            {activeTab === "profile" ? <ProfileScreen /> : null}
          </main>

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
}

export function DanceQueueApp({ currentUser }: DanceQueueAppProps) {
  return (
    <AppProvider currentUser={currentUser}>
      <AppFrame />
    </AppProvider>
  );
}
