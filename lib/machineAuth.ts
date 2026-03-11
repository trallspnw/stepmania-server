import { MachineToken } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function validateMachineToken(req: Request): Promise<MachineToken | null> {
  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return null;
  }

  const machineToken = await prisma.machineToken.findUnique({
    where: { token },
  });

  if (!machineToken) {
    return null;
  }

  return prisma.machineToken.update({
    where: { id: machineToken.id },
    data: { lastSeen: new Date() },
  });
}
