import { redirect } from "next/navigation";
import { getSessionUserRecord } from "@/lib/admin";
import { hasAdminUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function Home() {
  const adminExists = await hasAdminUser();

  if (!adminExists) {
    redirect("/setup");
  }

  const result = await getSessionUserRecord();

  if (result) {
    redirect("/dashboard");
  }

  redirect("/login");
}
