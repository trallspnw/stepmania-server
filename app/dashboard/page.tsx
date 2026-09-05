import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DanceQueueApp } from "@/components/dance-queue-app";
import { getEffectiveActor } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await getEffectiveActor();

  if (!result) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <DanceQueueApp
        currentUser={{
          id: result.user.id,
          loginName: result.user.loginName ?? "",
          displayName: result.user.displayName,
          isAdmin: result.user.isAdmin,
        }}
        initialActiveProfile={{
          id: result.activeUser.id,
          displayName: result.activeUser.displayName,
          isAdmin: result.activeUser.isAdmin,
          isChild: result.activeUser.isChild,
        }}
      />
    </Suspense>
  );
}
