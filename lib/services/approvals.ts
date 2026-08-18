import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export type ThresholdConditions = {
  minAmount?: number;
  maxAmount?: number;
};

export type PolicyContext = {
  amount?: number;
};

export type PolicyLike = {
  id: string;
  name: string;
  triggerType: string;
  thresholdConditions: unknown;
  approverRoleChain: unknown;
  slaHours: number;
  active: boolean;
};

export type PolicyMatch<P extends PolicyLike = PolicyLike> = {
  policy: P;
  reasonCodes: Record<string, unknown>;
};

/**
 * Pure routing logic (spec Section 8: "evaluate policy → create ApprovalRequest
 * + ordered ApprovalSteps → route"). Kept dependency-free from Prisma so it's
 * directly unit-testable — this is the actual decision a policy-threshold edit
 * in the admin console needs to visibly change.
 *
 * When multiple active policies for the trigger type match the same context
 * (shouldn't happen with well-formed, non-overlapping bands, but threshold
 * edits in the admin console could momentarily create overlap), the policy
 * with the highest `minAmount` wins — the most specific/narrowest band.
 */
export function selectPolicy<P extends PolicyLike>(policies: P[], context: PolicyContext): PolicyMatch<P> | null {
  const candidates = policies.filter((p) => p.active && matchesThreshold(p.thresholdConditions, context));
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aMin = (a.thresholdConditions as ThresholdConditions)?.minAmount ?? -Infinity;
    const bMin = (b.thresholdConditions as ThresholdConditions)?.minAmount ?? -Infinity;
    return bMin - aMin;
  });

  const policy = candidates[0];
  return { policy, reasonCodes: buildReasonCodes(policy, context) };
}

function matchesThreshold(rawConditions: unknown, context: PolicyContext): boolean {
  const conditions = (rawConditions ?? {}) as ThresholdConditions;
  if (conditions.minAmount === undefined && conditions.maxAmount === undefined) return true;

  if (context.amount === undefined) return false;
  if (conditions.minAmount !== undefined && context.amount < conditions.minAmount) return false;
  if (conditions.maxAmount !== undefined && context.amount >= conditions.maxAmount) return false;
  return true;
}

function buildReasonCodes(policy: PolicyLike, context: PolicyContext): Record<string, unknown> {
  const conditions = (policy.thresholdConditions ?? {}) as ThresholdConditions;
  return {
    matchedPolicy: policy.name,
    triggerType: policy.triggerType,
    thresholdConditions: conditions,
    ...(context.amount !== undefined ? { amount: context.amount } : {}),
  };
}

/** DB-backed wrapper: fetches active policies for the trigger type and routes through selectPolicy(). */
export async function evaluatePolicy(triggerType: string, context: PolicyContext): Promise<PolicyMatch | null> {
  const policies = await prisma.approvalPolicy.findMany({ where: { triggerType: triggerType as never, active: true } });
  return selectPolicy(policies, context);
}

type SubmitForApprovalInput = {
  triggerType: string;
  triggerEntityId: string;
  requestedById: string;
  context: PolicyContext;
};

/**
 * Generic entry point every approval-triggering module should call (spec
 * principle 4: approvals is a service, not reimplemented per module). Not
 * yet wired to a real module in Phase 3 — Pricing Exceptions (Phase 5),
 * Onboarding, and Escalations (Phase 8) will call this instead of writing
 * their own routing/status logic.
 */
export async function submitForApproval(input: SubmitForApprovalInput) {
  const match = await evaluatePolicy(input.triggerType, input.context);
  if (!match) {
    throw new Error(`No active approval policy matches triggerType=${input.triggerType} context=${JSON.stringify(input.context)}`);
  }

  const roleChain = match.policy.approverRoleChain as string[];

  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      policyId: match.policy.id,
      triggerType: input.triggerType as never,
      triggerEntityId: input.triggerEntityId,
      reasonCodes: match.reasonCodes as Prisma.InputJsonValue,
      status: "PENDING",
      requestedById: input.requestedById,
    },
  });

  await prisma.approvalStep.createMany({
    data: roleChain.map((role, i) => ({
      approvalRequestId: approvalRequest.id,
      stepOrder: i + 1,
      approverRole: role as never,
      status: "PENDING" as const,
    })),
  });

  return { approvalRequest, matchedPolicy: match.policy, reasonCodes: match.reasonCodes };
}
