import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SetupForm } from "@/components/setup-form";
import { hasAdminUser } from "@/lib/users";

export const dynamic = "force-dynamic";

function getSetupError(error?: string) {
  switch (error) {
    case "display_name_taken":
      return "That display name is already taken.";
    case "password_mismatch":
      return "Password and confirmation must match.";
    case "missing_fields":
      return "Display name and password are required.";
    case "password_too_short":
      return "Password must be at least 8 characters.";
    default:
      return undefined;
  }
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasAdminUser()) {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <AuthShell
      description="Create the first administrator account. This route closes permanently after bootstrap."
      title="First-run setup"
    >
      <SetupForm error={getSetupError(params.error)} />
    </AuthShell>
  );
}
