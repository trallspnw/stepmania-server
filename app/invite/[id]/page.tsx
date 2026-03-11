import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { InviteClaimForm } from "@/components/invite-claim-form";
import { getSessionUserRecord } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface InvitePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

function getInviteError(error?: string) {
  switch (error) {
    case "display_name_taken":
      return "That display name is already taken.";
    case "password_mismatch":
      return "Password and confirmation must match.";
    case "missing_fields":
      return "Display name and password are required.";
    case "password_too_short":
      return "Password must be at least 8 characters.";
    case "invalid_invite":
      return "This invite is invalid, expired, or has already been claimed.";
    default:
      return undefined;
  }
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const result = await getSessionUserRecord();

  if (result) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const invite = await prisma.invite.findUnique({
    where: { id },
  });

  const isInviteValid =
    invite &&
    invite.claimedAt === null &&
    invite.claimedBy === null &&
    invite.expiresAt > new Date();

  if (!isInviteValid) {
    return (
      <AuthShell
        description="This invite can no longer be used."
        heroDescription="Invite links expire after 48 hours and become unavailable once claimed."
        heroTitle="Invite Unavailable"
        title="Invite expired"
      >
        <p className="text-sm text-stone-600">
          Ask an administrator to generate a new invite link.
        </p>
      </AuthShell>
    );
  }

  const paramsValue = await searchParams;

  return (
    <AuthShell
      description={`Create your ${invite.roleIsAdmin ? "admin" : "player"} account.`}
      heroDescription="Accept your invite with a display name and password to join the server."
      heroTitle="Accept Invite"
      title="Create account"
    >
      <InviteClaimForm action={`/api/invite/${id}`} error={getInviteError(paramsValue.error)} />
    </AuthShell>
  );
}
