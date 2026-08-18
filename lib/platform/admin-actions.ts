"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentUser, PERSONA_COOKIE } from "./current-user";
import { can } from "./entitlements";
import { recordAuditEvent } from "@/lib/services/audit";
import { evaluatePolicy, type ThresholdConditions } from "@/lib/services/approvals";
import { runSeed } from "../../prisma/seed/run-seed";
import type { UserRole, DataScope } from "./types";

async function requireAdmin() {
  const user = await getCurrentUser();
  const allowed = await can(user, "admin-console", "view");
  if (!allowed) throw new Error("Not authorized: admin console access required.");
  return user;
}

function manifestFieldForRole(role: UserRole): "enabledAssociate" | "enabledLeader" | "enabledAdmin" {
  if (role === "SALES_ASSOCIATE") return "enabledAssociate";
  if (role === "SALES_LEADER") return "enabledLeader";
  return "enabledAdmin";
}

export async function updateEntitlement(role: UserRole, moduleId: string, dataScope: DataScope) {
  const admin = await requireAdmin();
  const before = await prisma.entitlement.findUnique({
    where: { role_moduleId_capability: { role, moduleId, capability: "view" } },
  });

  const updated = await prisma.entitlement.update({
    where: { role_moduleId_capability: { role, moduleId, capability: "view" } },
    data: { dataScope, allowed: dataScope !== "NONE" },
  });

  await recordAuditEvent({
    actor: admin,
    action: "entitlement.updated",
    entityType: "Entitlement",
    entityId: updated.id,
    before: before ? { dataScope: before.dataScope, allowed: before.allowed } : undefined,
    after: { dataScope: updated.dataScope, allowed: updated.allowed },
  });

  revalidatePath("/", "layout");
}

export async function updateModuleEnabled(moduleId: string, role: UserRole, enabled: boolean) {
  const admin = await requireAdmin();
  const field = manifestFieldForRole(role);
  const before = await prisma.moduleManifest.findUniqueOrThrow({ where: { moduleId } });

  const updated = await prisma.moduleManifest.update({
    where: { moduleId },
    data: { [field]: enabled },
  });

  await recordAuditEvent({
    actor: admin,
    action: "module.toggled",
    entityType: "ModuleManifest",
    entityId: updated.id,
    before: { [field]: before[field] },
    after: { [field]: updated[field] },
  });

  revalidatePath("/", "layout");
}

type UpdateApprovalPolicyInput = {
  minAmount: number | null;
  maxAmount: number | null;
  slaHours: number;
  active: boolean;
};

export async function updateApprovalPolicy(policyId: string, input: UpdateApprovalPolicyInput) {
  const admin = await requireAdmin();
  const before = await prisma.approvalPolicy.findUniqueOrThrow({ where: { id: policyId } });

  const thresholdConditions: ThresholdConditions = {};
  if (input.minAmount !== null) thresholdConditions.minAmount = input.minAmount;
  if (input.maxAmount !== null) thresholdConditions.maxAmount = input.maxAmount;

  const updated = await prisma.approvalPolicy.update({
    where: { id: policyId },
    data: {
      thresholdConditions: thresholdConditions as Prisma.InputJsonValue,
      slaHours: input.slaHours,
      active: input.active,
    },
  });

  // Approval routing for pricing exceptions governs rate/dealer-reserve
  // authority — a threshold or SLA edit here is compliance-relevant even
  // though no rate was quoted yet (spec: "anything touching rate, reserve,
  // or pricing authority ... sets complianceRelevant").
  await recordAuditEvent({
    actor: admin,
    action: "approval_policy.updated",
    entityType: "ApprovalPolicy",
    entityId: updated.id,
    before: { thresholdConditions: before.thresholdConditions, slaHours: before.slaHours, active: before.active },
    after: { thresholdConditions: updated.thresholdConditions, slaHours: updated.slaHours, active: updated.active },
    complianceRelevant: updated.triggerType === "EXCEPTION_REQUEST" || updated.triggerType === "TIER_CHANGE",
  });

  revalidatePath("/admin");
}

export async function updateRoutingRule(ruleId: string, input: { active: boolean; priority: number }) {
  const admin = await requireAdmin();
  const before = await prisma.routingRule.findUniqueOrThrow({ where: { id: ruleId } });

  const updated = await prisma.routingRule.update({
    where: { id: ruleId },
    data: { active: input.active, priority: input.priority },
  });

  await recordAuditEvent({
    actor: admin,
    action: "routing_rule.updated",
    entityType: "RoutingRule",
    entityId: updated.id,
    before: { active: before.active, priority: before.priority },
    after: { active: updated.active, priority: updated.priority },
  });

  revalidatePath("/admin");
}

/**
 * Read-only routing test the admin console uses to prove a threshold edit
 * changes live behavior (Phase 3 acceptance criterion) — evaluates the same
 * evaluatePolicy() a real ExceptionRequest submission will use later.
 */
export async function testApprovalRouting(triggerType: string, amount: number | null) {
  await requireAdmin();
  return evaluatePolicy(triggerType, amount !== null ? { amount } : {});
}

export async function resetDemoData() {
  await requireAdmin();
  await runSeed();

  // Every user/associate id was just regenerated — drop the stale persona
  // cookie so getCurrentUser() falls back cleanly to the default demo persona.
  const cookieStore = await cookies();
  cookieStore.delete(PERSONA_COOKIE);

  revalidatePath("/", "layout");
}
