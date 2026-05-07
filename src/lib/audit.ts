import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  diff?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      diff: diff !== undefined ? (diff as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}
