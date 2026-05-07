import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

interface AuditMutationParams {
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** Pass explicitly when calling outside of a request context (e.g. cron) */
  userId?: string;
}

export async function auditMutation({
  entity,
  entityId,
  action,
  before,
  after,
  userId: explicitUserId,
}: AuditMutationParams): Promise<void> {
  let actorId = explicitUserId;
  if (!actorId) {
    const session = await auth();
    actorId = session?.user?.id;
  }
  if (!actorId) return;

  const diff: Record<string, unknown> = {};
  if (before && after) {
    for (const key of Object.keys({ ...before, ...after })) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diff[key] = { before: before[key], after: after[key] };
      }
    }
  } else if (after) {
    diff.created = after;
  } else if (before) {
    diff.deleted = before;
  }

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action,
      entity,
      entityId,
      diff:
        Object.keys(diff).length > 0
          ? (diff as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });
}
