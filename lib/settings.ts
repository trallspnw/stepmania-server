import { prisma } from "@/lib/prisma";
import { SettingKey } from "@/lib/settingKeys";

export async function getSetting(key: SettingKey) {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  return setting?.value ?? null;
}

export async function setSettings(entries: Array<{ key: SettingKey; value: string | null }>) {
  await prisma.$transaction(
    entries.map(({ key, value }) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
}
