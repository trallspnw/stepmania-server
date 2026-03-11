"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, RefreshCw, Shield, ShieldOff, Trash2, UserX } from "lucide-react";
import { formatRelativeTime } from "@/lib/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextToastId = useRef(1);
  const signingOutRef = useRef(false);
  const router = useRouter();

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [users],
  );

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

  function pushToast(title: string, variant: ToastMessage["variant"] = "default") {
    const id = nextToastId.current;
    nextToastId.current += 1;
    setToasts((current) => [...current, { id, title, variant }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }

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
            <section className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-lg shadow-stone-900/5">
              <h2 className="text-xl font-semibold text-stone-950">Library</h2>
              <p className="mt-2 text-sm text-stone-600">Coming soon.</p>
            </section>
          </TabsContent>

          <TabsContent value="queue">
            <section className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-lg shadow-stone-900/5">
              <h2 className="text-xl font-semibold text-stone-950">Queue</h2>
              <p className="mt-2 text-sm text-stone-600">Coming soon.</p>
            </section>
          </TabsContent>

          <TabsContent value="system">
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
