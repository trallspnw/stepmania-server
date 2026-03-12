"use client";

import { useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound, RefreshCw, Trash2 } from "lucide-react";
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
import { useApp } from "@/lib/app-context";
import {
  formatRelativeTime,
  getDifficultyTone,
  getGradeTone,
  getPlayerById,
  getSongById,
} from "@/lib/mock-data";

export function ProfileScreen() {
  const { state, currentUser } = useApp();
  const currentPlayer = getPlayerById(state.currentPlayerId);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextToastId = useRef(1);

  if (!currentPlayer) {
    return (
      <div className="emptyState">
        <h2>Signed Out</h2>
        <p>You have been signed out.</p>
      </div>
    );
  }

  const myQueueEntries = state.queueEntries.filter(
    (entry) => entry.playerId === state.currentPlayerId,
  );
  const myHistoryEntries = state.historyEntries.filter(
    (entry) => entry.playerId === state.currentPlayerId,
  );

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

  return (
    <div className="stack profileStack">
      <section className="profileHero">
        <div className="profileAvatar">{currentUser.displayName.charAt(0)}</div>
        <div>
          <h2>{currentUser.displayName}</h2>
          {currentUser.isAdmin ? <span className="softPill">Admin</span> : null}
        </div>
      </section>

      <section className="card panelCard">
        <header className="panelHeader">
          <div className="panelTitle">
            <MusicIcon className="tinyIcon" />
            <span>My Queue ({myQueueEntries.length})</span>
          </div>
        </header>
        {myQueueEntries.length === 0 ? (
          <p className="muted">No songs in your queue.</p>
        ) : (
          <div className="stack tight">
            {myQueueEntries.map((entry) => {
              const song = getSongById(entry.songId);
              if (!song) return null;

              return (
                <div className="splitRow" key={entry.id}>
                  <div>
                    <h3>{song.title}</h3>
                    <p className="muted">{song.artist}</p>
                  </div>
                  <span
                    className={`pill ${getDifficultyTone(
                      entry.selectedDifficulty.slot,
                    )}`}
                  >
                    {entry.selectedDifficulty.slot} {entry.selectedDifficulty.level}
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
            <span>My History ({myHistoryEntries.length})</span>
          </div>
        </header>
        {myHistoryEntries.length === 0 ? (
          <p className="muted">No play history yet.</p>
        ) : (
          <div className="stack tight">
            {myHistoryEntries.map((entry) => {
              const song = getSongById(entry.songId);
              if (!song) return null;

              return (
                <div className="splitRow" key={entry.id}>
                  <div>
                    <h3>{song.title}</h3>
                    <div className="metaRow wrap">
                      <span className={`pill ${getDifficultyTone(entry.playedDifficulty.slot)}`}>
                        {entry.playedDifficulty.level}
                      </span>
                      <span className="muted">{formatRelativeTime(entry.completedAt)}</span>
                    </div>
                  </div>
                  <span className={`pill gradePill ${getGradeTone(entry.grade)}`}>
                    {entry.grade}
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

      <button
        className="ghostButton logoutButton"
        onClick={() => signOut({ callbackUrl: "/login" })}
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
    </div>
  );
}
