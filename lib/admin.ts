import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSessionUserRecord() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return { session, user };
}

export async function getAdminSession() {
  const result = await getSessionUserRecord();

  if (!result?.user.isAdmin) {
    return null;
  }

  return result;
}

export function getRequestBaseUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return `${forwardedProto ?? "https"}://${host}`;
  }

  return process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
}
