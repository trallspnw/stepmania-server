import { prisma } from "@/lib/prisma";

export function normalizeDisplayName(displayName: string) {
  return displayName.trim().toLocaleLowerCase();
}

export function normalizeLoginName(loginName: string) {
  return loginName.trim().toLocaleLowerCase();
}

/**
 * Given a Prisma P2002 unique-constraint error, says which identity field
 * collided so callers can return an accurate `*_taken` error code instead of
 * a generic one.
 */
export function getTakenIdentityField(
  error: unknown,
): "login" | "display" | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "P2002"
  ) {
    return null;
  }

  const target =
    "meta" in error &&
    typeof error.meta === "object" &&
    error.meta !== null &&
    "target" in error.meta
      ? error.meta.target
      : null;

  const targetFields = Array.isArray(target) ? target : [];

  if (targetFields.includes("login_name_normalized")) {
    return "login";
  }

  if (targetFields.includes("display_name_normalized")) {
    return "display";
  }

  return null;
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
