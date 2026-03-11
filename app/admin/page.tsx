import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin-console";
import { getSessionUserRecord } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const result = await getSessionUserRecord();

  if (!result) {
    redirect("/login");
  }

  if (!result.user.isAdmin) {
    redirect("/dashboard");
  }

  const [users, pendingInvites, machineTokens] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: {
        claimedAt: null,
        claimedBy: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.machineToken.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AdminConsole
      currentUserId={result.user.id}
      initialInvites={pendingInvites.map((invite) => ({
        id: invite.id,
        roleIsAdmin: invite.roleIsAdmin,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      }))}
      initialMachineTokens={machineTokens.map((token) => ({
        id: token.id,
        name: token.name,
        tokenPrefix: token.token.slice(0, 8),
        lastSeen: token.lastSeen?.toISOString() ?? null,
        createdAt: token.createdAt.toISOString(),
      }))}
      initialUsers={users.map((user) => ({
        id: user.id,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      }))}
    />
  );
}
