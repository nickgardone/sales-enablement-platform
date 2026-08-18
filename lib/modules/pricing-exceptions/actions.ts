"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";
import { evaluatePolicy, submitForApproval } from "@/lib/services/approvals";
import { resolveCurrentProgramAndRateSheet } from "./queries";

const MODULE_ID = "pricing-exceptions";

async function requireModuleAccess() {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Pricing Exceptions access required.");
  return user;
}

// Exceptions attribute to the account's assigned rep, matching the same
// convention used in Account 360's inline actions.
function resolveAssociateId(user: CurrentUser, rooftop: { assignedAssociateId: string | null }) {
  if (rooftop.assignedAssociateId) return rooftop.assignedAssociateId;
  if (user.associateId) return user.associateId;
  throw new Error("This rooftop has no assigned associate to attribute this request to.");
}

/** Live routing preview for the intake form — same evaluatePolicy() the admin's routing tester exercises. */
export async function previewExceptionRouting(dollarAmount: number) {
  await requireModuleAccess();
  return evaluatePolicy("EXCEPTION_REQUEST", { amount: dollarAmount });
}

/**
 * Canonical exception-submission entry point (spec principle 4: approvals is
 * a service, not reimplemented per module). Dealer Account 360's "start
 * exception request" dialog calls this too, rather than keeping its own copy.
 */
export async function submitExceptionRequest(input: {
  rooftopId: string;
  contactId: string | null;
  requestType: "RATE_EXCEPTION" | "PROGRAM_TIER_CHANGE" | "TERM_EXTENSION" | "FEE_WAIVER";
  dollarAmount: number;
  rationale: string;
}) {
  const user = await requireModuleAccess();
  const rooftop = await prisma.rooftop.findUniqueOrThrow({ where: { id: input.rooftopId } });
  const associateId = resolveAssociateId(user, rooftop);
  const { programId, rateSheetId } = await resolveCurrentProgramAndRateSheet(input.rooftopId);

  const exceptionRequest = await prisma.exceptionRequest.create({
    data: {
      rooftopId: input.rooftopId,
      contactId: input.contactId,
      associateId,
      requestType: input.requestType,
      currentProgramId: programId,
      rateSheetId,
      requestedTerms: {} as Prisma.InputJsonValue,
      rationale: input.rationale,
      dollarAmount: input.dollarAmount,
    },
  });

  const { approvalRequest, matchedPolicy, reasonCodes } = await submitForApproval({
    triggerType: "EXCEPTION_REQUEST",
    triggerEntityId: exceptionRequest.id,
    requestedById: user.id,
    context: { amount: input.dollarAmount },
  });

  await prisma.exceptionRequest.update({
    where: { id: exceptionRequest.id },
    data: { approvalRequestId: approvalRequest.id },
  });

  await emitSignal({
    type: "exception.submitted",
    payload: {
      exceptionRequestId: exceptionRequest.id,
      rooftopId: input.rooftopId,
      amount: input.dollarAmount,
      requestType: input.requestType,
      policy: matchedPolicy.name,
    },
    sourceModule: MODULE_ID,
    entityType: "ExceptionRequest",
    entityId: exceptionRequest.id,
  });
  // Anything touching rate/reserve/pricing authority is compliance-relevant per the spec's fair-lending
  // design constraint — the audit artifact is a product feature here, not a bolt-on.
  await recordAuditEvent({
    actor: user,
    action: "exception.submitted",
    entityType: "ExceptionRequest",
    entityId: exceptionRequest.id,
    after: {
      requestType: input.requestType,
      dollarAmount: input.dollarAmount,
      matchedPolicy: matchedPolicy.name,
      reasonCodes,
    } as Prisma.InputJsonValue,
    complianceRelevant: true,
  });

  revalidatePath("/exceptions");
  revalidatePath(`/accounts/${input.rooftopId}`);
  return { exceptionRequest, matchedPolicy, reasonCodes };
}

/**
 * Approver decision on the active step of an exception's approval chain.
 * Callable from the Leader's in-module queue or the Admin's Admin Console
 * queue — authorized by role match against the step itself (not module
 * entitlement), since Admin has NONE scope on this module but still decides
 * the high-tier steps routed to them.
 */
export async function decideApprovalStep(input: {
  exceptionRequestId: string;
  approvalRequestId: string;
  stepId: string;
  decision: "APPROVED" | "REJECTED";
  rationale: string;
}) {
  const user = await getCurrentUser();
  const step = await prisma.approvalStep.findUniqueOrThrow({ where: { id: input.stepId } });
  if (step.approverRole !== user.role) {
    throw new Error(`Not authorized: this step requires a ${step.approverRole.replace("_", " ")} decision.`);
  }
  if (step.status !== "PENDING") {
    throw new Error("This step has already been decided.");
  }

  const approvalRequest = await prisma.approvalRequest.findUniqueOrThrow({
    where: { id: input.approvalRequestId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  const now = new Date();
  await prisma.approvalStep.update({
    where: { id: step.id },
    data: { status: input.decision, decidedAt: now, decidedById: user.id, rationale: input.rationale },
  });

  const isLastStep = !approvalRequest.steps.some((s) => s.id !== step.id && s.stepOrder > step.stepOrder);

  let requestStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
  if (input.decision === "REJECTED") {
    requestStatus = "REJECTED";
    // The chain stops at the first rejection — later steps never get decided.
    await prisma.approvalStep.updateMany({
      where: { approvalRequestId: approvalRequest.id, stepOrder: { gt: step.stepOrder }, status: "PENDING" },
      data: { status: "SKIPPED" },
    });
  } else if (isLastStep) {
    requestStatus = "APPROVED";
  }

  if (requestStatus !== "PENDING") {
    await prisma.approvalRequest.update({
      where: { id: approvalRequest.id },
      data: { status: requestStatus, decidedAt: now, decidedById: user.id, decisionRationale: input.rationale },
    });
  }

  await emitSignal({
    type: "exception.decided",
    payload: {
      exceptionRequestId: input.exceptionRequestId,
      approvalRequestId: approvalRequest.id,
      stepDecision: input.decision,
      requestStatus,
    },
    sourceModule: MODULE_ID,
    entityType: "ExceptionRequest",
    entityId: input.exceptionRequestId,
  });
  await recordAuditEvent({
    actor: user,
    action: "exception.step_decided",
    entityType: "ApprovalStep",
    entityId: step.id,
    before: { status: "PENDING" },
    after: { status: input.decision, rationale: input.rationale, requestStatus },
    complianceRelevant: true,
  });

  revalidatePath("/exceptions");
  revalidatePath("/admin");
}
