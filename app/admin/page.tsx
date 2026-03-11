import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminConsole } from "@/components/admin-console";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard");
  }

  const [users, pendingInvites] = await Promise.all([
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
  ]);

  return (
    <AdminConsole
      currentUserId={Number(session.user.id)}
      initialInvites={pendingInvites.map((invite) => ({
        id: invite.id,
        roleIsAdmin: invite.roleIsAdmin,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
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
