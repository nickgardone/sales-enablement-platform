"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";

const MODULE_ID = "pitching";

async function requireModuleAccess() {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Pitching access required.");
  return user;
}

function resolveAssociateId(user: CurrentUser, rooftop: { assignedAssociateId: string | null }) {
  if (rooftop.assignedAssociateId) return rooftop.assignedAssociateId;
  if (user.associateId) return user.associateId;
  throw new Error("This rooftop has no assigned associate to attribute this pitch to.");
}

/**
 * Canonical pitch-logging entry point — Account 360's "log pitch" dialog
 * calls this too (spec principle 4 / "pitch data is emitted as a data
 * product other modules read" only holds if there's one write path).
 */
export async function logPitch(input: {
  rooftopId: string;
  contactId: string;
  productPitched: "FINANCING" | "SOFTWARE";
  outcome: "POSITIVE" | "NEUTRAL" | "DECLINED" | "FOLLOW_UP_NEEDED";
  objection: string | null;
}) {
  const user = await requireModuleAccess();
  const rooftop = await prisma.rooftop.findUniqueOrThrow({ where: { id: input.rooftopId } });
  const associateId = resolveAssociateId(user, rooftop);

  const occurredAt = new Date();
  const currentGoal = await prisma.pitchGoal.findFirst({
    where: { ownerType: "ASSOCIATE", associateId, period: { lte: occurredAt } },
    orderBy: { period: "desc" },
  });

  const pitch = await prisma.pitch.create({
    data: {
      rooftopId: input.rooftopId,
      contactId: input.contactId,
      associateId,
      pitchGoalId: currentGoal?.id ?? null,
      productPitched: input.productPitched,
      outcome: input.outcome,
      objection: input.objection,
      occurredAt,
    },
  });

  await emitSignal({
    type: "pitch.logged",
    payload: { pitchId: pitch.id, rooftopId: input.rooftopId, associateId, outcome: pitch.outcome },
    sourceModule: MODULE_ID,
    entityType: "Pitch",
    entityId: pitch.id,
  });
  await recordAuditEvent({
    actor: user,
    action: "pitch.logged",
    entityType: "Pitch",
    entityId: pitch.id,
    after: { outcome: pitch.outcome, productPitched: pitch.productPitched },
  });

  revalidatePath("/pitching");
  revalidatePath(`/accounts/${input.rooftopId}`);
  return pitch;
}
