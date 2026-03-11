import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(232,138,89,0.28),transparent_28%),radial-gradient(circle_at_top_right,rgba(111,154,214,0.2),transparent_22%),linear-gradient(180deg,#f5f0e8_0%,#ece8df_100%)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700/80">
            StepMania Server
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
            First Steps
          </h1>
          <p className="text-sm text-stone-600">
            Bootstrap access, sign in, and keep the first-run flow locked down.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
