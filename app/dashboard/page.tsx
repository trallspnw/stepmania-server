import { redirect } from "next/navigation";
import { DanceQueueApp } from "@/components/dance-queue-app";
import { getSessionUserRecord } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await getSessionUserRecord();

  if (!result) {
    redirect("/login");
  }

  return (
    <DanceQueueApp
      currentUser={{
        displayName: result.user.displayName,
        isAdmin: result.user.isAdmin,
      }}
    />
  );
}
