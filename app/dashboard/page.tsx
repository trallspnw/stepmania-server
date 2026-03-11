import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome, {session.user.displayName}</CardTitle>
          <CardDescription>
            Authentication is active and the first-run bootstrap path is closed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-zinc-300">
            <p>
              Signed in as <span className="font-semibold text-zinc-100">{session.user.displayName}</span>
            </p>
            <p className="mt-2">
              Admin status:{" "}
              <span className="font-semibold text-zinc-100">
                {session.user.isAdmin ? "Admin" : "User"}
              </span>
            </p>
          </div>

          <LogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}
