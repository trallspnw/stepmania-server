"use client";

import { useState } from "react";
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
import { AppProvider } from "@/lib/app-context";

const tabMeta = {
  queue: { title: "Queue", Icon: QueueIcon },
  browse: { title: "Browse", Icon: SearchIcon },
  history: { title: "History", Icon: HistoryIcon },
  profile: { title: "Profile", Icon: UserIcon },
} satisfies Record<Tab, { title: string; Icon: React.ElementType }>;

function AppFrame() {
  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const { title, Icon } = tabMeta[activeTab];

  return (
    <div className={styles.root}>
      <div className="appCanvas">
        <div className="appShell">
          <header className="topBar">
            <div className="topBarInner">
              <Icon className="sectionIcon accentIcon" />
              <div>
                <p className="topBarLabel">StepMania Server</p>
                <h1>{title}</h1>
              </div>
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

export function DanceQueueApp() {
  return (
    <AppProvider>
      <AppFrame />
    </AppProvider>
  );
}
