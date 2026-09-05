"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import styles from "@/components/dance-queue-app.module.css";
import { BottomNav, Tab } from "@/components/bottom-nav";
import { BrowseScreen } from "@/components/browse-screen";
import { HistoryScreen } from "@/components/history-screen";
import {
  HistoryIcon,
  LibraryIcon,
  QueueIcon,
  UserIcon,
} from "@/components/icons";
import { ProfileScreen } from "@/components/profile-screen";
import { QueueScreen } from "@/components/queue-screen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppProvider, useApp } from "@/lib/app-context";

interface DanceQueueAppProps {
  currentUser: {
    id: number;
    loginName: string;
    displayName: string;
    isAdmin: boolean;
  };
  initialActiveProfile: {
    id: number;
    displayName: string;
    isAdmin: boolean;
    isChild: boolean;
  };
}

interface SelectableChild {
  id: number;
  displayName: string;
}

const tabMeta = {
  queue: { title: "Queue", Icon: QueueIcon },
  browse: { title: "Library", Icon: LibraryIcon },
  history: { title: "History", Icon: HistoryIcon },
  profile: { title: "Profile", Icon: UserIcon },
} satisfies Record<Tab, { title: string; Icon: React.ElementType }>;

const tabs = Object.keys(tabMeta) as Tab[];

function AppFrame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = (tabs as string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "queue";
  const { title, Icon } = tabMeta[activeTab];

  function setActiveTab(tab: Tab) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`/dashboard?${params.toString()}`);
  }
  const { activeProfile, currentUser, setActiveProfile, setCurrentUser, switchProfile } = useApp();
  const signingOutRef = useRef(false);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [selectableChildren, setSelectableChildren] = useState<SelectableChild[]>([]);

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
          id: number;
          loginName: string;
          displayName: string;
          isAdmin: boolean;
          isActive: boolean;
        };
        activeUser?: {
          id: number;
          displayName: string;
          isAdmin: boolean;
          isChild: boolean;
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
          id: data.user.id,
          loginName: data.user.loginName,
          displayName: data.user.displayName,
          isAdmin: data.user.isAdmin,
        });

        if (data.activeUser) {
          setActiveProfile(data.activeUser);
        }
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
  }, [setActiveProfile, setCurrentUser]);

  useEffect(() => {
    if (!switchDialogOpen) {
      return;
    }

    let cancelled = false;

    async function loadSelectableChildren() {
      const response = await fetch("/api/children/active", { cache: "no-store" });

      if (!response.ok || cancelled) {
        return;
      }

      const data = (await response.json()) as SelectableChild[];

      if (!cancelled) {
        setSelectableChildren(data);
      }
    }

    void loadSelectableChildren();

    return () => {
      cancelled = true;
    };
  }, [switchDialogOpen]);

  async function handleSelectProfile(userId: number | null) {
    await switchProfile(userId);
    setSwitchDialogOpen(false);
  }

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
              <div className="topBarActions">
                <button
                  className="headerAction"
                  onClick={() => setSwitchDialogOpen(true)}
                  type="button"
                >
                  {activeProfile.isChild ? (
                    <span className="childProfileName">{activeProfile.displayName}</span>
                  ) : (
                    activeProfile.displayName
                  )}
                </button>
                {currentUser.isAdmin ? (
                  <Link className="headerAction" href="/admin">
                    Admin
                  </Link>
                ) : null}
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

      <Dialog onOpenChange={setSwitchDialogOpen} open={switchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Profile</DialogTitle>
            <DialogDescription>
              Choose who queue additions and the Profile tab are attributed to.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => void handleSelectProfile(null)}
              type="button"
              variant={activeProfile.isChild ? "outline" : "default"}
            >
              You ({currentUser.displayName})
            </Button>
            {selectableChildren.map((child) => (
              <Button
                key={child.id}
                onClick={() => void handleSelectProfile(child.id)}
                type="button"
                variant={activeProfile.isChild && activeProfile.id === child.id ? "default" : "outline"}
              >
                {child.displayName}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DanceQueueApp({ currentUser, initialActiveProfile }: DanceQueueAppProps) {
  return (
    <AppProvider currentUser={currentUser} initialActiveProfile={initialActiveProfile}>
      <AppFrame />
    </AppProvider>
  );
}
