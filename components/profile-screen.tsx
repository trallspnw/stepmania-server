"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Check, KeyRound, RefreshCw, Trash2, UserRound } from "lucide-react";
import { LogOutIcon, MusicIcon, TrophyIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastMessage, ToastViewport } from "@/components/ui/toast";
import { SongDetailSheet } from "@/components/song-detail-sheet";
import type { HistoryRecord } from "@/lib/history-types";
import type { BrowseSongRecord } from "@/lib/library-browser";
import { useApp } from "@/lib/app-context";
import { formatRelativeTime, getDifficultyTone, getGradeTone } from "@/lib/mock-data";

export function ProfileScreen() {
  const {
    activeProfile,
    currentUser,
    queueEntries,
    queueLoading,
    setActiveProfile,
    setCurrentUser,
    switchProfile,
  } = useApp();
  const [loginName, setLoginName] = useState(currentUser.loginName);
  const [displayName, setDisplayName] = useState(activeProfile.displayName);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextToastId = useRef(1);

  const [myHistoryEntries, setMyHistoryEntries] = useState<HistoryRecord[]>([]);
  const [myHistoryLoading, setMyHistoryLoading] = useState(true);
  const [myHistoryTotal, setMyHistoryTotal] = useState(0);
  const [myHistoryTotalPages, setMyHistoryTotalPages] = useState(1);
  const [myHistoryPage, setMyHistoryPage] = useState(1);
  const [activeProfileIdForHistory, setActiveProfileIdForHistory] = useState(activeProfile.id);
  const [selectedSong, setSelectedSong] = useState<BrowseSongRecord | null>(null);

  const myQueueEntries = queueEntries.filter((entry) => entry.user.id === activeProfile.id);

  async function openSongDetail(songId: number) {
    const response = await fetch(`/api/library/browse/songs/${songId}`, {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { song: BrowseSongRecord };
    setSelectedSong(data.song);
  }

  // Reset to page 1 when the active profile changes, computed during render
  // (not an effect) so the subsequent fetch effect only ever runs once per switch.
  if (activeProfileIdForHistory !== activeProfile.id) {
    setActiveProfileIdForHistory(activeProfile.id);

    if (myHistoryPage !== 1) {
      setMyHistoryPage(1);
    }
  }

  useEffect(() => {
    setLoginName(currentUser.loginName);
  }, [currentUser.loginName]);

  useEffect(() => {
    setDisplayName(activeProfile.displayName);
  }, [activeProfile.displayName]);

  async function loadMyHistory(page: number, options?: { silent?: boolean }) {
    if (!options?.silent) {
      setMyHistoryLoading(true);
    }

    const response = await fetch(`/api/profile/history?page=${page}`, {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!options?.silent) {
      setMyHistoryLoading(false);
    }

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      page: number;
      total: number;
      totalPages: number;
      entries: HistoryRecord[];
    };

    setMyHistoryEntries(data.entries);
    setMyHistoryTotal(data.total);
    setMyHistoryTotalPages(data.totalPages);
  }

  useEffect(() => {
    void loadMyHistory(myHistoryPage);

    const interval = window.setInterval(() => {
      void loadMyHistory(myHistoryPage, { silent: true });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeProfile.id, myHistoryPage]);

  function pushToast(title: string, variant: ToastMessage["variant"] = "default") {
    const id = nextToastId.current;
    nextToastId.current += 1;
    setToasts((current) => [...current, { id, title, variant }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }

  async function handlePasswordUpdate() {
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords must match.");
      return;
    }

    setPasswordError(null);
    setIsSavingPassword(true);

    const response = await fetch("/api/profile/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    setIsSavingPassword(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setPasswordError(data.error ?? "Password update failed.");
      return;
    }

    setPasswordDialogOpen(false);
    setPassword("");
    setConfirmPassword("");
    pushToast("Password updated");
  }

  async function handleAccountUpdate() {
    const nextLoginName = loginName.trim();
    const nextDisplayName = displayName.trim();

    if ((!activeProfile.isChild && !nextLoginName) || !nextDisplayName) {
      setAccountError("Login name and display name are required.");
      return;
    }

    const loginNameChanged = !activeProfile.isChild && nextLoginName !== currentUser.loginName;
    const displayNameChanged = nextDisplayName !== activeProfile.displayName;

    if (!loginNameChanged && !displayNameChanged) {
      setAccountError(null);
      return;
    }

    setAccountError(null);
    setIsSavingAccount(true);

    const response = await fetch("/api/profile/account", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(loginNameChanged ? { loginName: nextLoginName } : {}),
        ...(displayNameChanged ? { displayName: nextDisplayName } : {}),
      }),
    });

    setIsSavingAccount(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      switch (data.error) {
        case "login_name_taken":
          setAccountError("That login name is already taken.");
          break;
        case "display_name_taken":
          setAccountError("That display name is already taken.");
          break;
        case "missing_fields":
          setAccountError("Login name and display name are required.");
          break;
        default:
          setAccountError("Account update failed.");
          break;
      }

      return;
    }

    const data = (await response.json()) as {
      user: { id: number; loginName: string | null; displayName: string; isAdmin: boolean };
    };

    if (!activeProfile.isChild) {
      setCurrentUser({
        id: data.user.id,
        loginName: data.user.loginName ?? "",
        displayName: data.user.displayName,
        isAdmin: data.user.isAdmin,
      });
      setActiveProfile({
        id: data.user.id,
        displayName: data.user.displayName,
        isAdmin: data.user.isAdmin,
        isChild: false,
      });
      setLoginName(data.user.loginName ?? "");
    } else {
      setActiveProfile({
        id: data.user.id,
        displayName: data.user.displayName,
        isAdmin: false,
        isChild: true,
      });
    }

    setDisplayName(data.user.displayName);
    pushToast("Account updated");
  }

  async function handleDeleteAccount() {
    setIsDeletingAccount(true);

    const response = await fetch("/api/profile/account", {
      method: "DELETE",
    });

    setIsDeletingAccount(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      pushToast(data.error ?? "Failed to delete account", "destructive");
      return;
    }

    await signOut({ callbackUrl: "/login" });
  }

  async function handleSignOut() {
    // Clear the active-profile cookie so this browser doesn't start the next login
    // still "acting as" a child. This is always a full logout of the real adult.
    await switchProfile(null);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="stack profileStack">
      <section className="profileHero">
        <div className="profileAvatar">{activeProfile.displayName.charAt(0)}</div>
        <div>
          <h2>{activeProfile.displayName}</h2>
          {activeProfile.isAdmin ? <span className="softPill">Admin</span> : null}
        </div>
      </section>

      <section className="card panelCard">
        <header className="panelHeader">
          <div className="panelTitle">
            <UserRound className="tinyIcon" />
            <span>Account</span>
          </div>
        </header>
        <div className="space-y-4">
          {!activeProfile.isChild ? (
            <div className="space-y-2">
              <Label htmlFor="profile-login-name">Login Name</Label>
              <Input
                id="profile-login-name"
                maxLength={64}
                onChange={(event) => setLoginName(event.target.value)}
                value={loginName}
              />
              <p className="muted">The name you sign in with.</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="profile-display-name">Display Name</Label>
            <Input
              id="profile-display-name"
              maxLength={64}
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
            <p className="muted">The name shown throughout the app.</p>
          </div>

          {accountError ? <p className="text-sm text-red-600">{accountError}</p> : null}

          <div className="profileActionRow">
            <Button
              className="profileActionButton"
              disabled={
                isSavingAccount ||
                ((activeProfile.isChild || loginName.trim() === currentUser.loginName) &&
                  displayName.trim() === activeProfile.displayName)
              }
              onClick={handleAccountUpdate}
              type="button"
            >
              {isSavingAccount ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      <section className="card panelCard">
        <header className="panelHeader">
          <div className="panelTitle">
            <MusicIcon className="tinyIcon" />
            <span>My Queue ({myQueueEntries.length})</span>
          </div>
        </header>
        {queueLoading ? (
          <p className="muted">Loading queue...</p>
        ) : myQueueEntries.length === 0 ? (
          <p className="muted">No songs in your queue.</p>
        ) : (
          <div className="stack tight">
            {myQueueEntries.map((entry) => {
              return (
                <div className="splitRow" key={entry.id}>
                  <div>
                    <h3>{entry.song.title}</h3>
                    <p className="muted">{entry.song.artist}</p>
                  </div>
                  <span
                    className={`pill ${getDifficultyTone(entry.chart.difficultySlot)}`}
                  >
                    {entry.chart.difficultySlot} {entry.chart.meter}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card panelCard">
        <header className="panelHeader">
          <div className="panelTitle">
            <TrophyIcon className="tinyIcon" />
            <span>My History ({myHistoryTotal})</span>
          </div>
        </header>
        {myHistoryLoading ? (
          <p className="muted">Loading history...</p>
        ) : myHistoryEntries.length === 0 ? (
          <p className="muted">No play history yet.</p>
        ) : (
          <>
            <div className="stack tight">
              {myHistoryEntries.map((entry) => {
                return (
                  <button
                    className="card historyCard"
                    key={entry.id}
                    onClick={() => void openSongDetail(entry.song.id)}
                    type="button"
                  >
                    <div className="historyContent">
                      <h3>{entry.song.title}</h3>
                      <div className="metaRow wrap">
                        <span className={`pill ${getDifficultyTone(entry.chart.difficultySlot)}`}>
                          {entry.chart.difficultySlot} {entry.chart.meter}
                        </span>
                        {entry.score != null ? <span className="muted">{entry.score.toFixed(2)}%</span> : null}
                        {entry.isTest ? <span className="softPill">Test</span> : null}
                        <span className="muted">{formatRelativeTime(new Date(entry.playedAt))}</span>
                      </div>
                    </div>
                    <span className={`pill gradePill ${getGradeTone(entry.grade ?? "C")}`}>
                      {entry.grade ?? "-"}
                    </span>
                  </button>
                );
              })}
            </div>

            {myHistoryTotalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 pt-3">
                <span className="muted">
                  Page {myHistoryPage} of {myHistoryTotalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    disabled={myHistoryPage <= 1}
                    onClick={() => setMyHistoryPage((current) => Math.max(1, current - 1))}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={myHistoryPage >= myHistoryTotalPages}
                    onClick={() =>
                      setMyHistoryPage((current) => Math.min(myHistoryTotalPages, current + 1))
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {!activeProfile.isChild ? (
        <section className="card panelCard">
          <header className="panelHeader">
            <div className="panelTitle">
              <KeyRound className="tinyIcon" />
              <span>Security</span>
            </div>
          </header>
          <div className="splitRow">
            <div>
              <h3>Password</h3>
              <p className="muted">Update your account password.</p>
            </div>
            <Button onClick={() => setPasswordDialogOpen(true)} type="button" variant="outline">
              Change Password
            </Button>
          </div>
        </section>
      ) : null}

      {!activeProfile.isChild ? (
        <section className="card panelCard">
          <header className="panelHeader">
            <div className="panelTitle">
              <Trash2 className="tinyIcon" />
              <span>Delete Account</span>
            </div>
          </header>
          <div className="splitRow">
            <div>
              <h3>Remove this account</h3>
              <p className="muted">This permanently deletes your account and related records.</p>
            </div>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => setDeleteDialogOpen(true)}
              type="button"
            >
              Delete Account
            </Button>
          </div>
        </section>
      ) : null}

      <button
        className="ghostButton logoutButton"
        onClick={() => void handleSignOut()}
        type="button"
      >
        <LogOutIcon className="tinyIcon" />
        <span>Sign Out</span>
      </button>

      <Dialog onOpenChange={setPasswordDialogOpen} open={passwordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Set a new password for your account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-password">New Password</Label>
              <Input
                id="profile-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-confirm-password">Confirm Password</Label>
              <Input
                id="profile-confirm-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </div>

            {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setPasswordDialogOpen(false);
                setPasswordError(null);
                setPassword("");
                setConfirmPassword("");
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSavingPassword} onClick={handlePasswordUpdate} type="button">
              {isSavingPassword ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This will also delete any related
              queue items, play history, and other owned records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeletingAccount}
              onClick={handleDeleteAccount}
              type="button"
            >
              {isDeletingAccount ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastViewport toasts={toasts} />

      <SongDetailSheet onClose={() => setSelectedSong(null)} song={selectedSong} />
    </div>
  );
}
