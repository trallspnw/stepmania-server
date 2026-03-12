import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/settingKeys";

export async function deleteUserAndOwnedData(userId: number) {
  await prisma.$transaction(async (tx) => {
    await tx.setting.updateMany({
      where: {
        key: SETTING_KEYS.CURRENT_PLAYER_ID,
        value: String(userId),
      },
      data: {
        value: null,
      },
    });

    await tx.user.delete({
      where: { id: userId },
    });
  });
}
