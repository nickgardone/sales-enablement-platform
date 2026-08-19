"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can, scopeFilter } from "@/lib/platform/entitlements";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";
import { submitForApproval } from "@/lib/services/approvals";
import type { ChecklistItem } from "./types";

const MODULE_ID = "dealer-onboarding";

async function requireCaseInScope(caseId: string) {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Dealer Onboarding access required.");

  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const onboardingCase = await prisma.onboardingCase.findFirst({ where: { id: caseId, rooftop: rooftopWhere } });
  if (!onboardingCase) throw new Error("Onboarding case not found or outside your scope.");
  return { user, onboardingCase };
}

export async function toggleChecklistItem(caseId: string, itemIndex: number) {
  const { user, onboardingCase } = await requireCaseInScope(caseId);
  if (onboardingCase.status === "COMPLETE" || onboardingCase.status === "BLOCKED") {
    throw new Error("This case is no longer editable.");
  }

  const checklist = ((onboardingCase.checklist as { items?: ChecklistItem[] })?.items ?? []) as ChecklistItem[];
  if (!checklist[itemIndex]) throw new Error("Checklist item not found.");
  checklist[itemIndex] = { ...checklist[itemIndex], done: !checklist[itemIndex].done };

  await prisma.onboardingCase.update({
    where: { id: caseId },
    data: { checklist: { items: checklist } as Prisma.InputJsonValue, status: onboardingCase.status === "OPEN" ? "IN_PROGRESS" : onboardingCase.status },
  });

  await recordAuditEvent({
    actor: user,
    action: "onboarding.checklist_updated",
    entityType: "OnboardingCase",
    entityId: caseId,
    after: { item: checklist[itemIndex].label, done: checklist[itemIndex].done },
  });

  revalidatePath("/onboarding");
}

/** The module's one primary action: hand off a completed checklist to the Approvals service. */
export async function submitOnboardingForApproval(caseId: string) {
  const { user, onboardingCase } = await requireCaseInScope(caseId);
  if (onboardingCase.approvalRequestId) throw new Error("Already submitted for approval.");

  const checklist = ((onboardingCase.checklist as { items?: ChecklistItem[] })?.items ?? []) as ChecklistItem[];
  if (checklist.length === 0 || !checklist.every((i) => i.done)) {
    throw new Error("Complete every checklist item before submitting for approval.");
  }

  const { approvalRequest } = await submitForApproval({
    triggerType: "ONBOARDING_CASE",
    triggerEntityId: caseId,
    requestedById: user.id,
    context: {},
  });

  await prisma.onboardingCase.update({ where: { id: caseId }, data: { approvalRequestId: approvalRequest.id } });

  await emitSignal({
    type: "onboarding.submitted",
    payload: { onboardingCaseId: caseId, rooftopId: onboardingCase.rooftopId },
    sourceModule: MODULE_ID,
    entityType: "OnboardingCase",
    entityId: caseId,
  });
  await recordAuditEvent({
    actor: user,
    action: "onboarding.submitted_for_approval",
    entityType: "OnboardingCase",
    entityId: caseId,
    after: { approvalRequestId: approvalRequest.id },
  });

  revalidatePath("/onboarding");
}
