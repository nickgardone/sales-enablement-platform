"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can } from "@/lib/platform/entitlements";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";

const MODULE_ID = "closing-deals";

async function requireModuleAccess() {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Closing Deals access required.");
  return user;
}

function resolveAssociateId(user: CurrentUser, rooftop: { assignedAssociateId: string | null }) {
  if (rooftop.assignedAssociateId) return rooftop.assignedAssociateId;
  if (user.associateId) return user.associateId;
  throw new Error("This rooftop has no assigned associate to attribute this deal to.");
}

async function requireOpportunityInScope(user: CurrentUser, opportunityId: string) {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const opportunity = await prisma.opportunity.findFirst({ where: { id: opportunityId, rooftop: rooftopWhere } });
  if (!opportunity) throw new Error("Opportunity not found or outside your scope.");
  return opportunity;
}

/** Canonical opportunity-creation entry point — Account 360's dialog calls this too. */
export async function createOpportunity(input: {
  rooftopId: string;
  productType: "FINANCING" | "SOFTWARE";
  expectedValue: number;
  closeDate: string;
}) {
  const user = await requireModuleAccess();
  const rooftop = await prisma.rooftop.findUniqueOrThrow({ where: { id: input.rooftopId } });
  const associateId = resolveAssociateId(user, rooftop);

  const prospectingStage = await prisma.dealStage.findFirstOrThrow({ where: { sortOrder: 1 } });

  const opportunity = await prisma.opportunity.create({
    data: {
      rooftopId: input.rooftopId,
      associateId,
      productType: input.productType,
      dealStageId: prospectingStage.id,
      expectedValue: input.expectedValue,
      closeDate: new Date(input.closeDate),
    },
  });

  await emitSignal({
    type: "opportunity.stage.changed",
    payload: { opportunityId: opportunity.id, rooftopId: input.rooftopId, stage: prospectingStage.name },
    sourceModule: MODULE_ID,
    entityType: "Opportunity",
    entityId: opportunity.id,
  });
  await recordAuditEvent({
    actor: user,
    action: "opportunity.created",
    entityType: "Opportunity",
    entityId: opportunity.id,
    after: { productType: input.productType, expectedValue: input.expectedValue, stage: prospectingStage.name },
  });

  revalidatePath("/deals");
  revalidatePath(`/accounts/${input.rooftopId}`);
  return opportunity;
}

/** Manual stage moves — Funded is intentionally excluded in the UI since funding is an underwriting outcome, not a sales-set stage. */
export async function updateOpportunityStage(opportunityId: string, dealStageId: string) {
  const user = await requireModuleAccess();
  const opportunity = await requireOpportunityInScope(user, opportunityId);
  const before = await prisma.dealStage.findUniqueOrThrow({ where: { id: opportunity.dealStageId } });
  const after = await prisma.dealStage.findUniqueOrThrow({ where: { id: dealStageId } });

  await prisma.opportunity.update({ where: { id: opportunityId }, data: { dealStageId } });

  await emitSignal({
    type: "opportunity.stage.changed",
    payload: { opportunityId, rooftopId: opportunity.rooftopId, fromStage: before.name, toStage: after.name },
    sourceModule: MODULE_ID,
    entityType: "Opportunity",
    entityId: opportunityId,
  });
  await recordAuditEvent({
    actor: user,
    action: "opportunity.stage_changed",
    entityType: "Opportunity",
    entityId: opportunityId,
    before: { stage: before.name },
    after: { stage: after.name },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${opportunityId}`);
  revalidatePath(`/accounts/${opportunity.rooftopId}`);
}

export async function clearStip(stipId: string) {
  const user = await requireModuleAccess();
  const stip = await prisma.stip.findUniqueOrThrow({
    where: { id: stipId },
    include: { application: { include: { opportunity: true } } },
  });
  await requireOpportunityInScope(user, stip.application.opportunity.id);
  if (stip.status !== "OUTSTANDING") throw new Error("This stipulation is already cleared.");

  const clearedAt = new Date();
  await prisma.stip.update({ where: { id: stipId }, data: { status: "CLEARED", clearedAt } });

  await emitSignal({
    type: "stip.cleared",
    payload: { stipId, applicationId: stip.applicationId, rooftopId: stip.application.opportunity.rooftopId },
    sourceModule: MODULE_ID,
    entityType: "Stip",
    entityId: stipId,
  });
  await recordAuditEvent({
    actor: user,
    action: "stip.cleared",
    entityType: "Stip",
    entityId: stipId,
    before: { status: "OUTSTANDING" },
    after: { status: "CLEARED" },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${stip.application.opportunity.id}`);
  revalidatePath(`/accounts/${stip.application.opportunity.rooftopId}`);
}
