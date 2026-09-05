import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_PROFILE_COOKIE = "active_profile_id";

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

export async function getEffectiveActor() {
  const result = await getSessionUserRecord();

  if (!result) {
    return null;
  }

  const cookieStore = await cookies();
  const rawId = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value;
  const parsedId = rawId ? Number(rawId) : NaN;

  if (Number.isInteger(parsedId)) {
    const candidate = await prisma.user.findUnique({ where: { id: parsedId } });

    if (candidate && candidate.isChild && candidate.isActive) {
      return { ...result, activeUser: candidate };
    }
  }

  return { ...result, activeUser: result.user };
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
