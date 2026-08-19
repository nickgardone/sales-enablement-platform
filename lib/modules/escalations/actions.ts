"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can, scopeFilter } from "@/lib/platform/entitlements";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";
import { submitForApproval } from "@/lib/services/approvals";

const MODULE_ID = "escalations-disputes";

async function requireModuleAccess() {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Escalations & Disputes access required.");
  return user;
}

/** The module's intake action — creates the record and routes it through the shared Approvals service. */
export async function raiseEscalation(input: { rooftopId: string; category: string; description: string }) {
  const user = await requireModuleAccess();
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rooftop = await prisma.rooftop.findFirst({ where: { id: input.rooftopId, ...rooftopWhere } });
  if (!rooftop) throw new Error("Rooftop not found or outside your scope.");

  const escalation = await prisma.escalation.create({
    data: { rooftopId: input.rooftopId, raisedById: user.id, category: input.category, description: input.description },
  });

  const { approvalRequest } = await submitForApproval({
    triggerType: "ESCALATION",
    triggerEntityId: escalation.id,
    requestedById: user.id,
    context: {},
  });
  await prisma.escalation.update({ where: { id: escalation.id }, data: { approvalRequestId: approvalRequest.id, status: "IN_PROGRESS" } });

  await emitSignal({
    type: "escalation.raised",
    payload: { escalationId: escalation.id, rooftopId: input.rooftopId, category: input.category },
    sourceModule: MODULE_ID,
    entityType: "Escalation",
    entityId: escalation.id,
  });
  await recordAuditEvent({
    actor: user,
    action: "escalation.raised",
    entityType: "Escalation",
    entityId: escalation.id,
    after: { category: input.category, description: input.description },
  });

  revalidatePath("/escalations");
  return escalation;
}

export async function resolveEscalation(escalationId: string, resolutionNotes: string) {
  const user = await requireModuleAccess();
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const escalation = await prisma.escalation.findFirst({ where: { id: escalationId, rooftop: rooftopWhere } });
  if (!escalation) throw new Error("Escalation not found or outside your scope.");
  if (escalation.status === "RESOLVED") throw new Error("This escalation is already resolved.");

  const resolvedAt = new Date();
  await prisma.escalation.update({
    where: { id: escalationId },
    data: { status: "RESOLVED", resolutionNotes, resolvedAt },
  });

  await emitSignal({
    type: "escalation.resolved",
    payload: { escalationId, rooftopId: escalation.rooftopId },
    sourceModule: MODULE_ID,
    entityType: "Escalation",
    entityId: escalationId,
  });
  await recordAuditEvent({
    actor: user,
    action: "escalation.resolved",
    entityType: "Escalation",
    entityId: escalationId,
    before: { status: escalation.status },
    after: { status: "RESOLVED", resolutionNotes },
  });

  revalidatePath("/escalations");
}
