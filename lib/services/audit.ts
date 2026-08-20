import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { CurrentUser } from "@/lib/platform/types";

type RecordAuditEventInput = {
  actor: CurrentUser;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  complianceRelevant?: boolean;
};

// Shared audit service (spec principle 4 + 5): every state-changing server
// action calls this instead of writing to AuditEvent directly, so the shape
// and compliance-flagging rule stay consistent across every module.
export async function recordAuditEvent(input: RecordAuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      actorId: input.actor.id,
      actorRole: input.actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      complianceRelevant: input.complianceRelevant ?? false,
    },
  });
}

export type AuditTrailEntityRef = { entityType: string; entityId: string };

/**
 * Audit events are recorded against whichever entity a mutation actually
 * touched (an Interaction, a Pitch, an ExceptionRequest...), never duplicated
 * onto every ancestor. So "the audit trail on a rooftop" is the union of
 * every entity that belongs to it — callers pass the full set of refs (e.g.
 * from the same records the activity timeline already gathered).
 */
export async function getAuditTrail(entities: AuditTrailEntityRef[], limit = 50) {
  if (entities.length === 0) return [];
  return prisma.auditEvent.findMany({
    where: { OR: entities.map((e) => ({ entityType: e.entityType, entityId: e.entityId })) },
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { actor: { select: { name: true, role: true } } },
  });
}

export async function getRecentAuditEvents(limit = 10) {
  return prisma.auditEvent.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { actor: { select: { name: true, role: true } } },
  });
}
