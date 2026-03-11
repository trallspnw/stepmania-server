import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DanceQueueApp } from "@/components/dance-queue-app";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return <DanceQueueApp />;
}
