import { prisma } from "@/lib/prisma";

export function normalizeDisplayName(displayName: string) {
  return displayName.trim().toLocaleLowerCase();
}

export function getAdminUser() {
  return prisma.user.findFirst({
    where: { isAdmin: true },
  });
}

export async function hasAdminUser() {
  const admin = await getAdminUser();
  return admin !== null;
}
