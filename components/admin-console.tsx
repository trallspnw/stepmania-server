"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, RefreshCw, Shield, ShieldOff, Trash2, UserX } from "lucide-react";
import { formatRelativeTime } from "@/lib/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastMessage, ToastViewport } from "@/components/ui/toast";

type AdminUser = {
  id: number;
  displayName: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
};

type PendingInvite = {
  id: string;
  roleIsAdmin: boolean;
  expiresAt: string;
  createdAt: string;
};

type MachineTokenRecord = {
  id: number;
  name: string;
  tokenPrefix: string;
  lastSeen: string | null;
  createdAt: string;
};

type ActiveUserOption = {
  id: string;
  displayName: string;
};

type CurrentSongSettings = {
  songPath: string;
  difficulty: string;
  playerId: string;
};

type PackIngestResult = {
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: { folder: string; error: string }[];
};

type AggregateSongIngestResult = {
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: { folder: string; error: string }[];
};

type ChartIngestResult = {
  created: number;
  deleted: number;
};

type IngestionStatus = {
  runId: number | null;
  status: "idle" | "running" | "completed" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  packs: {
    status: "idle" | "running" | "completed" | "failed" | "pending";
    result: PackIngestResult | null;
    error: string | null;
  };
  songs: {
    status: "idle" | "running" | "completed" | "failed" | "pending";
    result: AggregateSongIngestResult | null;
    error: string | null;
  };
  charts: {
    status: "idle" | "running" | "completed" | "failed" | "pending";
    result: ChartIngestResult | null;
    error: string | null;
  };
};

type LibraryPackRecord = {
  id: number;
  folderName: string;
  sortIndex: string | null;
  titles: string;
  platforms: string | null;
  regions: string | null;
  earliestRelease: string | null;
  source: string | null;
  isCustom: boolean;
  isCommunity: boolean;
  songCount: number;
  updatedAt: string;
};

type LibraryPacksResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  packs: LibraryPackRecord[];
};

type LibrarySongRecord = {
  id: number;
  title: string;
  artist: string | null;
  simfileType: string;
  bpmMin: number | null;
  bpmMax: number | null;
  available: boolean;
  ingestFlags: string | null;
  chartCount: number;
  updatedAt: string;
};

type LibrarySongsResponse = {
  pack: {
    id: number;
    folderName: string;
    titles: string;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  songs: LibrarySongRecord[];
};

interface AdminConsoleProps {
  currentUserId: number;
  initialUsers: AdminUser[];
  initialInvites: PendingInvite[];
  initialMachineTokens: MachineTokenRecord[];
}

function roleVariant(isAdmin: boolean) {
  return isAdmin ? "blue" : "gray";
}

function statusVariant(isActive: boolean) {
  return isActive ? "green" : "red";
}

export function AdminConsole({
  currentUserId,
  initialUsers,
  initialInvites,
  initialMachineTokens,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState(initialUsers);
  const [invites, setInvites] = useState(initialInvites);
  const [machineTokens, setMachineTokens] = useState(initialMachineTokens);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"player" | "admin">("player");
  const [generatedInvite, setGeneratedInvite] = useState<{
    url: string;
    expiresAt: string;
    roleIsAdmin: boolean;
    id: string;
    createdAt: string;
  } | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [machineTokenDialogOpen, setMachineTokenDialogOpen] = useState(false);
  const [machineTokenName, setMachineTokenName] = useState("");
  const [machineTokenError, setMachineTokenError] = useState<string | null>(null);
  const [generatedMachineToken, setGeneratedMachineToken] = useState<{
    id: number;
    name: string;
    token: string;
    tokenPrefix: string;
    lastSeen: string | null;
    createdAt: string;
  } | null>(null);
  const [revokeTokenRecord, setRevokeTokenRecord] = useState<MachineTokenRecord | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUserOption[]>([]);
  const [currentSongLoading, setCurrentSongLoading] = useState(true);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus | null>(null);
  const [libraryPacks, setLibraryPacks] = useState<LibraryPacksResponse | null>(null);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<LibraryPackRecord | null>(null);
  const [librarySongs, setLibrarySongs] = useState<LibrarySongsResponse | null>(null);
  const [librarySongsPage, setLibrarySongsPage] = useState(1);
  const [librarySongsLoading, setLibrarySongsLoading] = useState(false);
  const [currentSongSettings, setCurrentSongSettings] = useState<CurrentSongSettings>({
    songPath: "",
    difficulty: "",
    playerId: "",
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextToastId = useRef(1);
  const signingOutRef = useRef(false);
  const lastIngestionStatusRef = useRef<IngestionStatus["status"] | null>(null);
  const router = useRouter();

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [users],
  );

  function pushToast(title: string, variant: ToastMessage["variant"] = "default") {
    const id = nextToastId.current;
    nextToastId.current += 1;
    setToasts((current) => [...current, { id, title, variant }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }

  async function loadLibraryPacks(page: number) {
    setLibraryLoading(true);

    const response = await fetch(`/api/admin/library/packs?page=${page}`, {
      cache: "no-store",
    });

    setLibraryLoading(false);

    if (!response.ok) {
      pushToast("Failed to load library packs", "destructive");
      return;
    }

    const data = (await response.json()) as LibraryPacksResponse;
    setLibraryPacks(data);
  }

  async function loadLibrarySongs(packId: number, page: number) {
    setLibrarySongsLoading(true);

    const response = await fetch(`/api/admin/library/packs/${packId}/songs?page=${page}`, {
      cache: "no-store",
    });

    setLibrarySongsLoading(false);

    if (!response.ok) {
      pushToast("Failed to load pack songs", "destructive");
      return;
    }

    const data = (await response.json()) as LibrarySongsResponse;
    setLibrarySongs(data);
  }

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

      if (!data.user.isAdmin && !cancelled) {
        router.replace("/dashboard");
        router.refresh();
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
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadIngestionStatus() {
      const response = await fetch("/api/admin/ingestion", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as IngestionStatus;

      if (!cancelled) {
        setIngestionStatus(data);
      }
    }

    void loadIngestionStatus();

    const interval = window.setInterval(() => {
      void loadIngestionStatus();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "library") {
      return;
    }

    void loadLibraryPacks(libraryPage);
  }, [activeTab, libraryPage]);

  useEffect(() => {
    if (activeTab !== "library" || !selectedPack) {
      return;
    }

    void loadLibrarySongs(selectedPack.id, librarySongsPage);
  }, [activeTab, selectedPack, librarySongsPage]);

  useEffect(() => {
    if (!ingestionStatus) {
      return;
    }

    const previousStatus = lastIngestionStatusRef.current;
    lastIngestionStatusRef.current = ingestionStatus.status;

    if (previousStatus === "running" && ingestionStatus.status === "completed") {
      const packResult = ingestionStatus.packs.result;
      const songResult = ingestionStatus.songs.result;
      const chartResult = ingestionStatus.charts.result;
      void loadLibraryPacks(libraryPage);
      if (selectedPack) {
        void loadLibrarySongs(selectedPack.id, librarySongsPage);
      }
      if (packResult && songResult && chartResult) {
        pushToast(
          `Packs: ${packResult.created} created, ${packResult.updated} updated, ${packResult.unchanged} unchanged\nSongs: ${songResult.created} created, ${songResult.updated} updated, ${songResult.errors.length} errors\nCharts: ${chartResult.created} created, ${chartResult.deleted} deleted`,
        );
      } else {
        pushToast("Library ingestion finished");
      }
    }

    if (previousStatus === "running" && ingestionStatus.status === "failed") {
      pushToast("Library ingestion failed", "destructive");
    }
  }, [ingestionStatus]);

  useEffect(() => {
    let cancelled = false;

    async function loadSystemData() {
      const [settingsResponse, usersResponse] = await Promise.all([
        fetch("/api/admin/settings/current-song", { cache: "no-store" }),
        fetch("/api/admin/users/active", { cache: "no-store" }),
      ]);

      if (!settingsResponse.ok || !usersResponse.ok) {
        if (!cancelled) {
          setCurrentSongLoading(false);
          pushToast("Failed to load system settings", "destructive");
        }
        return;
      }

      const settings = (await settingsResponse.json()) as {
        songPath: string | null;
        difficulty: string | null;
        playerId: string | null;
      };
      const users = (await usersResponse.json()) as ActiveUserOption[];

      if (!cancelled) {
        setCurrentSongSettings({
          songPath: settings.songPath ?? "",
          difficulty: settings.difficulty ?? "",
          playerId: settings.playerId ?? "",
        });
        setActiveUsers(users);
        setCurrentSongLoading(false);
      }
    }

    void loadSystemData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function copyToClipboard(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    pushToast(`${label} copied`);
  }

  async function toggleUserValue(
    userId: number,
    field: "isActive" | "isAdmin",
    endpoint: "status" | "role",
  ) {
    const previousUsers = users;

    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, [field]: !user[field] } : user,
      ),
    );
    setLoadingId(`${endpoint}-${userId}`);

    const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
      method: "PUT",
    });

    if (!response.ok) {
      setUsers(previousUsers);
      pushToast(`Unable to update ${field === "isActive" ? "status" : "role"}`, "destructive");
    } else {
      const updatedUser = (await response.json()) as {
        id: number;
        isActive: boolean;
        isAdmin: boolean;
      };

      setUsers((current) =>
        current.map((user) =>
          user.id === updatedUser.id
            ? { ...user, isActive: updatedUser.isActive, isAdmin: updatedUser.isAdmin }
            : user,
        ),
      );
    }

    setLoadingId(null);
  }

  async function handlePasswordReset() {
    if (!passwordUser) {
      return;
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords must match.");
      return;
    }

    setPasswordError(null);
    setLoadingId(`password-${passwordUser.id}`);

    const response = await fetch(`/api/admin/users/${passwordUser.id}/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    setLoadingId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setPasswordError(data.error ?? "Password reset failed.");
      return;
    }

    pushToast(`Password reset for ${passwordUser.displayName}`);
    setPasswordUser(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleDeleteUser() {
    if (!deleteUser) {
      return;
    }

    const userToDelete = deleteUser;
    const previousUsers = users;
    const previousActiveUsers = activeUsers;
    const previousPlayerId = currentSongSettings.playerId;

    setUsers((current) => current.filter((user) => user.id !== userToDelete.id));
    setActiveUsers((current) => current.filter((user) => Number(user.id) !== userToDelete.id));
    if (currentSongSettings.playerId === String(userToDelete.id)) {
      setCurrentSongSettings((current) => ({ ...current, playerId: "" }));
    }
    setLoadingId(`delete-${userToDelete.id}`);

    const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
      method: "DELETE",
    });

    setLoadingId(null);

    if (!response.ok) {
      setUsers(previousUsers);
      setActiveUsers(previousActiveUsers);
      setCurrentSongSettings((current) => ({ ...current, playerId: previousPlayerId }));
      pushToast("Failed to delete user", "destructive");
      return;
    }

    pushToast(`Deleted ${userToDelete.displayName}`);
    setDeleteUser(null);
  }

  async function handleGenerateInvite() {
    setLoadingId("generate-invite");

    const response = await fetch("/api/admin/invites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: inviteRole }),
    });

    setLoadingId(null);

    if (!response.ok) {
      pushToast("Failed to generate invite", "destructive");
      return;
    }

    const invite = (await response.json()) as {
      id: string;
      url: string;
      roleIsAdmin: boolean;
      expiresAt: string;
      createdAt: string;
    };

    setGeneratedInvite(invite);
    setInvites((current) => [
      {
        id: invite.id,
        roleIsAdmin: invite.roleIsAdmin,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      },
      ...current,
    ]);
  }

  async function revokeInvite(id: string) {
    const previousInvites = invites;
    setInvites((current) => current.filter((invite) => invite.id !== id));
    setLoadingId(`revoke-${id}`);

    const response = await fetch(`/api/admin/invites/${id}`, {
      method: "DELETE",
    });

    setLoadingId(null);

    if (!response.ok) {
      setInvites(previousInvites);
      pushToast("Failed to revoke invite", "destructive");
      return;
    }

    pushToast("Invite revoked");
  }

  async function handleGenerateMachineToken() {
    if (!machineTokenName.trim()) {
      setMachineTokenError("Token name is required.");
      return;
    }

    setMachineTokenError(null);
    setLoadingId("generate-machine-token");

    const response = await fetch("/api/admin/machine-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: machineTokenName }),
    });

    setLoadingId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMachineTokenError(
        data.error === "name_required" ? "Token name is required." : "Failed to generate token.",
      );
      return;
    }

    const token = (await response.json()) as {
      id: number;
      name: string;
      token: string;
      tokenPrefix: string;
      lastSeen: string | null;
      createdAt: string;
    };

    setGeneratedMachineToken(token);
    setMachineTokens((current) => [
      {
        id: token.id,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        lastSeen: token.lastSeen,
        createdAt: token.createdAt,
      },
      ...current,
    ]);
    pushToast(`Created machine token ${token.name}`);
  }

  async function revokeMachineToken(token: MachineTokenRecord) {
    const previousTokens = machineTokens;
    setMachineTokens((current) => current.filter((item) => item.id !== token.id));
    setLoadingId(`revoke-machine-token-${token.id}`);

    const response = await fetch(`/api/admin/machine-tokens/${token.id}`, {
      method: "DELETE",
    });

    setLoadingId(null);

    if (!response.ok) {
      setMachineTokens(previousTokens);
      pushToast("Failed to revoke machine token", "destructive");
      return;
    }

    pushToast(`Revoked ${token.name}`);
    setRevokeTokenRecord(null);
  }

  async function saveCurrentSongSettings() {
    setLoadingId("save-current-song");

    const response = await fetch("/api/admin/settings/current-song", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(currentSongSettings),
    });

    setLoadingId(null);

    if (!response.ok) {
      pushToast("Failed to save settings", "destructive");
      return;
    }

    pushToast("Current song updated");
  }

  async function startIngestion() {
    setLoadingId("start-ingestion");

    const response = await fetch("/api/admin/ingestion", {
      method: "POST",
    });

    setLoadingId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      pushToast(data.error ?? "Library ingestion failed to start", "destructive");
      return;
    }

    const data = (await response.json()) as {
      started: boolean;
      status: IngestionStatus;
    };

    setIngestionStatus(data.status);

    if (data.started) {
      pushToast("Library ingestion started");
      return;
    }

    pushToast("Library ingestion is already running");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(232,138,89,0.28),transparent_28%),radial-gradient(circle_at_top_right,rgba(111,154,214,0.2),transparent_22%),linear-gradient(180deg,#f5f0e8_0%,#ece8df_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700/80">
                StepMania Server
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Admin</h1>
              <p className="text-sm text-stone-600">
                Manage users and invitations. Library and queue tools will land here next.
              </p>
            </div>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <section className="space-y-4 rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-lg shadow-stone-900/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-stone-950">Users</h2>
                  <p className="text-sm text-stone-600">Manage current accounts and access.</p>
                </div>
                <Button onClick={() => setGenerateDialogOpen(true)} type="button">
                  Generate Invite
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="min-w-[260px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => {
                      const isSelf = user.id === currentUserId;

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium text-stone-900">
                            {user.displayName}
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleVariant(user.isAdmin)}>
                              {user.isAdmin ? "Admin" : "Player"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(user.isActive)}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-stone-600">
                            {formatRelativeTime(user.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                disabled={isSelf || loadingId === `status-${user.id}`}
                                onClick={() => toggleUserValue(user.id, "isActive", "status")}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                {user.isActive ? "Deactivate" : "Reactivate"}
                              </Button>
                              <Button
                                disabled={isSelf || loadingId === `role-${user.id}`}
                                onClick={() => toggleUserValue(user.id, "isAdmin", "role")}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                {user.isAdmin ? (
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                ) : (
                                  <Shield className="mr-2 h-4 w-4" />
                                )}
                                {user.isAdmin ? "Demote to Player" : "Promote to Admin"}
                              </Button>
                              <Button
                                disabled={isSelf}
                                onClick={() => {
                                  setPasswordUser(user);
                                  setPassword("");
                                  setConfirmPassword("");
                                  setPasswordError(null);
                                }}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Reset Password
                              </Button>
                              <Button
                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                disabled={isSelf || loadingId === `delete-${user.id}`}
                                onClick={() => setDeleteUser(user)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-lg shadow-stone-900/5">
              <div>
                <h2 className="text-xl font-semibold text-stone-950">Pending Invites</h2>
                <p className="text-sm text-stone-600">
                  Unclaimed invites that have not expired.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="min-w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-stone-600" colSpan={4}>
                          No pending invites.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="text-stone-600">
                            {formatRelativeTime(invite.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleVariant(invite.roleIsAdmin)}>
                              {invite.roleIsAdmin ? "Admin" : "Player"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-stone-600">
                            {formatRelativeTime(invite.expiresAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                onClick={() =>
                                  copyToClipboard(
                                    `${window.location.origin}/invite/${invite.id}`,
                                    "Invite link",
                                  )
                                }
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                              </Button>
                              <Button
                                disabled={loadingId === `revoke-${invite.id}`}
                                onClick={() => revokeInvite(invite.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Revoke
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="library">
            <section className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Library Ingestion</CardTitle>
                  <CardDescription>
                    Start a background library ingestion run and monitor status here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      disabled={loadingId === "start-ingestion" || ingestionStatus?.status === "running"}
                      onClick={() => void startIngestion()}
                      type="button"
                    >
                      <RefreshCw
                        className={
                          loadingId === "start-ingestion" || ingestionStatus?.status === "running"
                            ? "mr-2 h-4 w-4 animate-spin"
                            : "mr-2 h-4 w-4"
                        }
                      />
                      Run Ingestion
                    </Button>
                  </div>

                  <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/80 p-4 text-sm text-stone-700">
                    <p>
                      <span className="font-medium text-stone-900">Status:</span>{" "}
                      {ingestionStatus ? ingestionStatus.status : "Loading"}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Packs:</span>{" "}
                      {ingestionStatus?.packs.status ?? "idle"}
                      {ingestionStatus?.packs.result
                        ? ` (${ingestionStatus.packs.result.created} created, ${ingestionStatus.packs.result.updated} updated, ${ingestionStatus.packs.result.unchanged} unchanged)`
                        : ""}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Songs:</span>{" "}
                      {ingestionStatus?.songs.status ?? "idle"}
                      {ingestionStatus?.songs.result
                        ? ` (${ingestionStatus.songs.result.created} created, ${ingestionStatus.songs.result.updated} updated, ${ingestionStatus.songs.result.unchanged} unchanged)`
                        : ""}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Charts:</span>{" "}
                      {ingestionStatus?.charts.status ?? "idle"}
                      {ingestionStatus?.charts.result
                        ? ` (${ingestionStatus.charts.result.created} created, ${ingestionStatus.charts.result.deleted} deleted)`
                        : ""}
                    </p>
                    {ingestionStatus?.startedAt ? (
                      <p>
                        <span className="font-medium text-stone-900">Started:</span>{" "}
                        {formatRelativeTime(ingestionStatus.startedAt)}
                      </p>
                    ) : null}
                    {ingestionStatus?.finishedAt ? (
                      <p>
                        <span className="font-medium text-stone-900">Finished:</span>{" "}
                        {formatRelativeTime(ingestionStatus.finishedAt)}
                      </p>
                    ) : null}
                    {ingestionStatus?.packs.error ? (
                      <p className="text-red-700">
                        <span className="font-medium">Pack error:</span> {ingestionStatus.packs.error}
                      </p>
                    ) : null}
                    {ingestionStatus?.songs.error ? (
                      <p className="text-red-700">
                        <span className="font-medium">Song error:</span> {ingestionStatus.songs.error}
                      </p>
                    ) : null}
                    {ingestionStatus?.charts.error ? (
                      <p className="text-red-700">
                        <span className="font-medium">Chart error:</span> {ingestionStatus.charts.error}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Current Packs</CardTitle>
                      <CardDescription>
                        Database-backed pack inventory, paginated at 100 per page.
                      </CardDescription>
                    </div>
                    <Button
                      disabled={libraryLoading}
                      onClick={() => void loadLibraryPacks(libraryPage)}
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw className={libraryLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-stone-600">
                    {libraryPacks
                      ? `${libraryPacks.total} packs total, page ${libraryPacks.page} of ${libraryPacks.totalPages}`
                      : "Loading pack inventory"}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pack</TableHead>
                          <TableHead>Platforms</TableHead>
                          <TableHead>Regions</TableHead>
                          <TableHead>Release</TableHead>
                          <TableHead>Songs</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="min-w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!libraryPacks || libraryLoading ? (
                          <TableRow>
                            <TableCell className="text-stone-600" colSpan={8}>
                              Loading packs...
                            </TableCell>
                          </TableRow>
                        ) : libraryPacks.packs.length === 0 ? (
                          <TableRow>
                            <TableCell className="text-stone-600" colSpan={8}>
                              No packs found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          libraryPacks.packs.map((pack) => {
                            const [displayTitle, ...alternateTitles] = pack.titles.split("|");
                            return (
                              <TableRow key={pack.id}>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium text-stone-900">{displayTitle}</div>
                                    <div className="text-xs text-stone-500">{pack.folderName}</div>
                                    <div className="flex flex-wrap gap-2">
                                      {pack.isCommunity ? <Badge variant="blue">Community</Badge> : null}
                                      {pack.isCustom ? <Badge variant="green">Custom</Badge> : null}
                                      {alternateTitles.length > 0 ? (
                                        <Badge variant="gray">{alternateTitles.length + 1} titles</Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-stone-600">
                                  {pack.platforms ?? "-"}
                                </TableCell>
                                <TableCell className="text-stone-600">
                                  {pack.regions ?? "-"}
                                </TableCell>
                                <TableCell className="text-stone-600">
                                  {pack.earliestRelease ?? "-"}
                                </TableCell>
                                <TableCell className="text-stone-600">{pack.songCount}</TableCell>
                                <TableCell className="max-w-[260px] text-stone-600">
                                  {pack.source && /^https?:\/\//.test(pack.source) ? (
                                    <a
                                      className="break-all text-amber-700 underline decoration-amber-300 underline-offset-2"
                                      href={pack.source}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      {pack.source}
                                    </a>
                                  ) : pack.source ? (
                                    <span className="break-all">{pack.source}</span>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell className="text-stone-600">
                                  {formatRelativeTime(pack.updatedAt)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    onClick={() => {
                                      setSelectedPack(pack);
                                      setLibrarySongsPage(1);
                                    }}
                                    size="sm"
                                    type="button"
                                    variant={selectedPack?.id === pack.id ? "default" : "outline"}
                                  >
                                    View Songs
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-stone-600">
                      Showing up to {libraryPacks?.pageSize ?? 100} packs per page
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={libraryLoading || libraryPage <= 1}
                        onClick={() => setLibraryPage((current) => Math.max(1, current - 1))}
                        type="button"
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={
                          libraryLoading ||
                          !libraryPacks ||
                          libraryPage >= libraryPacks.totalPages
                        }
                        onClick={() =>
                          setLibraryPage((current) =>
                            libraryPacks ? Math.min(libraryPacks.totalPages, current + 1) : current + 1,
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedPack ? (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Songs In {selectedPack.titles.split("|")[0]}</CardTitle>
                        <CardDescription>
                          {selectedPack.folderName}
                        </CardDescription>
                      </div>
                      <Button
                        disabled={librarySongsLoading}
                        onClick={() => void loadLibrarySongs(selectedPack.id, librarySongsPage)}
                        type="button"
                        variant="outline"
                      >
                        <RefreshCw
                          className={librarySongsLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"}
                        />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-stone-600">
                      {librarySongs
                        ? `${librarySongs.total} songs total, page ${librarySongs.page} of ${librarySongs.totalPages}`
                        : "Loading songs"}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Artist</TableHead>
                            <TableHead>Simfile</TableHead>
                            <TableHead>BPM</TableHead>
                            <TableHead>Charts</TableHead>
                            <TableHead>Flags</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!librarySongs || librarySongsLoading ? (
                            <TableRow>
                              <TableCell className="text-stone-600" colSpan={8}>
                                Loading songs...
                              </TableCell>
                            </TableRow>
                          ) : librarySongs.songs.length === 0 ? (
                            <TableRow>
                              <TableCell className="text-stone-600" colSpan={8}>
                                No songs found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            librarySongs.songs.map((song) => (
                              <TableRow key={song.id}>
                                <TableCell className="font-medium text-stone-900">{song.title}</TableCell>
                                <TableCell className="text-stone-600">{song.artist ?? "-"}</TableCell>
                                <TableCell className="text-stone-600 uppercase">{song.simfileType}</TableCell>
                                <TableCell className="text-stone-600">
                                  {song.bpmMin && song.bpmMax
                                    ? song.bpmMin === song.bpmMax
                                      ? `${song.bpmMin}`
                                      : `${song.bpmMin}-${song.bpmMax}`
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-stone-600">{song.chartCount}</TableCell>
                                <TableCell className="max-w-[240px] text-stone-600">
                                  {song.ingestFlags ?? "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={song.available ? "green" : "red"}>
                                    {song.available ? "Available" : "Missing"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-stone-600">
                                  {formatRelativeTime(song.updatedAt)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-stone-600">
                        Showing up to {librarySongs?.pageSize ?? 100} songs per page
                      </div>
                      <div className="flex gap-2">
                        <Button
                          disabled={librarySongsLoading || librarySongsPage <= 1}
                          onClick={() => setLibrarySongsPage((current) => Math.max(1, current - 1))}
                          type="button"
                          variant="outline"
                        >
                          Previous
                        </Button>
                        <Button
                          disabled={
                            librarySongsLoading ||
                            !librarySongs ||
                            librarySongsPage >= librarySongs.totalPages
                          }
                          onClick={() =>
                            setLibrarySongsPage((current) =>
                              librarySongs ? Math.min(librarySongs.totalPages, current + 1) : current + 1,
                            )
                          }
                          type="button"
                          variant="outline"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </section>
          </TabsContent>

          <TabsContent value="queue">
            <section className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-lg shadow-stone-900/5">
              <h2 className="text-xl font-semibold text-stone-950">Queue</h2>
              <p className="mt-2 text-sm text-stone-600">Coming soon.</p>
            </section>
          </TabsContent>

          <TabsContent value="system">
            <section className="space-y-6">
              <section className="space-y-4 rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-lg shadow-stone-900/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-stone-950">Machine Tokens</h2>
                  <p className="text-sm text-stone-600">
                    Bearer tokens for trusted machine API access.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setMachineTokenDialogOpen(true);
                    setMachineTokenName("");
                    setMachineTokenError(null);
                    setGeneratedMachineToken(null);
                  }}
                  type="button"
                >
                  Add Token
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="min-w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machineTokens.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-stone-600" colSpan={5}>
                          No machine tokens yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      machineTokens.map((token) => (
                        <TableRow key={token.id}>
                          <TableCell className="font-medium text-stone-900">{token.name}</TableCell>
                          <TableCell className="font-mono text-stone-600">
                            {token.tokenPrefix}
                            {"\u2022".repeat(8)}
                          </TableCell>
                          <TableCell className="text-stone-600">
                            {token.lastSeen ? formatRelativeTime(token.lastSeen) : "Never"}
                          </TableCell>
                          <TableCell className="text-stone-600">
                            {formatRelativeTime(token.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => setRevokeTokenRecord(token)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              </section>

              <Card>
                <CardHeader>
                  <CardTitle>Current Song</CardTitle>
                  <CardDescription>
                    Configure the current song context shared with the game integration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentSongLoading ? (
                    <div className="space-y-4">
                      <div className="h-11 animate-pulse rounded-md bg-stone-100" />
                      <div className="h-11 animate-pulse rounded-md bg-stone-100" />
                      <div className="h-11 animate-pulse rounded-md bg-stone-100" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="current-song-path">Song Path</Label>
                        <Input
                          id="current-song-path"
                          onChange={(event) =>
                            setCurrentSongSettings((current) => ({
                              ...current,
                              songPath: event.target.value,
                            }))
                          }
                          placeholder="Pack Name/Song Title"
                          value={currentSongSettings.songPath}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="current-song-difficulty">Difficulty</Label>
                        <Select
                          id="current-song-difficulty"
                          onChange={(event) =>
                            setCurrentSongSettings((current) => ({
                              ...current,
                              difficulty: event.target.value,
                            }))
                          }
                          value={currentSongSettings.difficulty}
                        >
                          <option value="">Select difficulty</option>
                          <option value="Beginner">Beginner</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                          <option value="Expert">Expert</option>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="current-song-player">Player</Label>
                        <Select
                          id="current-song-player"
                          onChange={(event) =>
                            setCurrentSongSettings((current) => ({
                              ...current,
                              playerId: event.target.value,
                            }))
                          }
                          value={currentSongSettings.playerId}
                        >
                          <option value="">Select player</option>
                          {activeUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.displayName}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <Button
                          disabled={loadingId === "save-current-song"}
                          onClick={saveCurrentSongSettings}
                          type="button"
                        >
                          {loadingId === "save-current-song" ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog onOpenChange={setGenerateDialogOpen} open={generateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invite</DialogTitle>
            <DialogDescription>Create a new invite link for a player or admin.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                className="flex h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                id="invite-role"
                onChange={(event) => setInviteRole(event.target.value as "player" | "admin")}
                value={inviteRole}
              >
                <option value="player">Player</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {generatedInvite ? (
              <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="space-y-2">
                  <Label htmlFor="generated-invite-url">Invite Link</Label>
                  <div className="flex gap-2">
                    <Input id="generated-invite-url" readOnly value={generatedInvite.url} />
                    <Button
                      onClick={() => copyToClipboard(generatedInvite.url, "Invite link")}
                      type="button"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-stone-600">Expires in 48 hours</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setGenerateDialogOpen(false);
                setGeneratedInvite(null);
              }}
              type="button"
              variant="outline"
            >
              Close
            </Button>
            <Button
              disabled={loadingId === "generate-invite"}
              onClick={handleGenerateInvite}
              type="button"
            >
              {loadingId === "generate-invite" ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={() => setPasswordUser(null)} open={passwordUser !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordUser?.displayName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </div>

            {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
          </div>

          <DialogFooter>
            <Button onClick={() => setPasswordUser(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              disabled={loadingId === `password-${passwordUser?.id ?? ""}`}
              onClick={handlePasswordReset}
              type="button"
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={() => setDeleteUser(null)} open={deleteUser !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteUser?.displayName}? This will also delete
              their play history, queue items, and other owned records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button onClick={() => setDeleteUser(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={loadingId === `delete-${deleteUser?.id ?? ""}`}
              onClick={handleDeleteUser}
              type="button"
            >
              {loadingId === `delete-${deleteUser?.id ?? ""}` ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setMachineTokenDialogOpen(open);
          if (!open) {
            setMachineTokenName("");
            setMachineTokenError(null);
            setGeneratedMachineToken(null);
          }
        }}
        open={machineTokenDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Token</DialogTitle>
            <DialogDescription>Create a new machine token.</DialogDescription>
          </DialogHeader>

          {generatedMachineToken ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="generated-machine-token">Token</Label>
                <div className="flex gap-2">
                  <Input id="generated-machine-token" readOnly value={generatedMachineToken.token} />
                  <Button
                    onClick={() => copyToClipboard(generatedMachineToken.token, "Machine token")}
                    type="button"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-amber-700">
                This token will not be shown again. Copy it now.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="machine-token-name">Token Name</Label>
                <Input
                  id="machine-token-name"
                  onChange={(event) => setMachineTokenName(event.target.value)}
                  placeholder="Arcade Cabinet"
                  value={machineTokenName}
                />
              </div>
              {machineTokenError ? <p className="text-sm text-red-600">{machineTokenError}</p> : null}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                setMachineTokenDialogOpen(false);
                setMachineTokenName("");
                setMachineTokenError(null);
                setGeneratedMachineToken(null);
              }}
              type="button"
              variant="outline"
            >
              Close
            </Button>
            {!generatedMachineToken ? (
              <Button
                disabled={loadingId === "generate-machine-token"}
                onClick={handleGenerateMachineToken}
                type="button"
              >
                {loadingId === "generate-machine-token" ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={() => setRevokeTokenRecord(null)} open={revokeTokenRecord !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Machine Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke {revokeTokenRecord?.name}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button onClick={() => setRevokeTokenRecord(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              disabled={
                !revokeTokenRecord ||
                loadingId === `revoke-machine-token-${revokeTokenRecord?.id ?? ""}`
              }
              onClick={() => revokeTokenRecord && revokeMachineToken(revokeTokenRecord)}
              type="button"
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastViewport toasts={toasts} />
    </main>
  );
}
