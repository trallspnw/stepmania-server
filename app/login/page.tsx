import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { authOptions } from "@/lib/auth";
import { hasAdminUser } from "@/lib/users";

export const dynamic = "force-dynamic";

function getLoginError(error?: string) {
  switch (error) {
    case "CredentialsSignin":
      return "Invalid credentials or inactive account.";
    default:
      return undefined;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await hasAdminUser())) {
    redirect("/setup");
  }

  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <AuthShell
      description="Sign in with your display name and password."
      heroDescription="Sign in to manage the queue, browse songs, and run the server."
      heroTitle="Welcome Back"
      title="Login"
    >
      <LoginForm error={getLoginError(params.error)} />
    </AuthShell>
  );
}
