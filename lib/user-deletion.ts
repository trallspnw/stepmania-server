import { prisma } from "@/lib/prisma";

export async function deleteUserAndOwnedData(userId: number) {
  await prisma.user.delete({
    where: { id: userId },
  });
}
