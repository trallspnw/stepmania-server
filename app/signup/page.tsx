/**
 * Open sign-up page: creates a player account without an invite while an
 * admin has open sign-up turned on.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { CreateAccountForm } from "@/components/create-account-form";
import { getSessionUserRecord } from "@/lib/admin";
import { isOpenSignUpEnabled } from "@/lib/sign-up";
import { hasAdminUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (!(await hasAdminUser())) {
    redirect("/setup");
  }

  if (await getSessionUserRecord()) {
    redirect("/dashboard");
  }

  if (!(await isOpenSignUpEnabled())) {
    return (
      <AuthShell
        description="New accounts need an invite right now."
        heroDescription="Sign-up opens when an administrator turns it on."
        heroTitle="Sign-Up Closed"
        title="Sign-up closed"
      >
        <p className="text-sm text-stone-600">
          Ask an administrator for an invite link, or{" "}
          <Link className="font-medium text-amber-700 underline" href="/login">
            sign in
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      description="Create your player account."
      heroDescription="Pick a login name, a display name for the queue, and a password."
      heroTitle="Join the Queue"
      title="Create account"
    >
      <CreateAccountForm action="/api/signup" />
    </AuthShell>
  );
}
