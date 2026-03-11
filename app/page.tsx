import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasAdminUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function Home() {
  const adminExists = await hasAdminUser();

  if (!adminExists) {
    redirect("/setup");
  }

  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
