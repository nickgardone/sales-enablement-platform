"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";
import { submitExceptionRequest } from "@/lib/modules/pricing-exceptions/actions";
import { logPitch as canonicalLogPitch } from "@/lib/modules/pitching/actions";
import { createOpportunity as canonicalCreateOpportunity } from "@/lib/modules/closing-deals/actions";

const MODULE_ID = "dealer-account-360";

async function requireAccountAccess(rooftopId: string) {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Account 360 access required.");

  const rooftop = await prisma.rooftop.findUniqueOrThrow({ where: { id: rooftopId } });
  return { user, rooftop };
}

// Interactions/pitches/exceptions/opportunities attribute to the account's
// assigned rep — this lets a leader log activity from an associate's
// Account 360 page without the record misattributing to the leader.
function resolveAssociateId(user: CurrentUser, rooftop: { assignedAssociateId: string | null }) {
  if (rooftop.assignedAssociateId) return rooftop.assignedAssociateId;
  if (user.associateId) return user.associateId;
  throw new Error("This rooftop has no assigned associate to attribute this action to.");
}

export async function logInteraction(input: {
  rooftopId: string;
  contactId: string | null;
  type: "VISIT" | "CALL" | "EMAIL" | "VIRTUAL";
  notes: string | null;
}) {
  const { user, rooftop } = await requireAccountAccess(input.rooftopId);
  const associateId = resolveAssociateId(user, rooftop);

  const interaction = await prisma.interaction.create({
    data: {
      rooftopId: input.rooftopId,
      contactId: input.contactId,
      associateId,
      type: input.type,
      notes: input.notes,
      occurredAt: new Date(),
    },
  });

  await recordAuditEvent({
    actor: user,
    action: "interaction.logged",
    entityType: "Interaction",
    entityId: interaction.id,
    after: { type: interaction.type, rooftopId: input.rooftopId },
  });

  revalidatePath(`/accounts/${input.rooftopId}`);
  return interaction;
}

// Delegates to the canonical implementation in the pitching module (spec
// principle 4) — a "use server" file can only export async function
// declarations, not re-export bindings, hence the thin wrapper.
export async function logPitch(input: {
  rooftopId: string;
  contactId: string;
  productPitched: "FINANCING" | "SOFTWARE";
  outcome: "POSITIVE" | "NEUTRAL" | "DECLINED" | "FOLLOW_UP_NEEDED";
  objection: string | null;
}) {
  const result = await canonicalLogPitch(input);
  revalidatePath(`/accounts/${input.rooftopId}`);
  return result;
}

export async function shareContent(input: { rooftopId: string; contactId: string | null; contentAssetId: string }) {
  const { user, rooftop } = await requireAccountAccess(input.rooftopId);
  const associateId = resolveAssociateId(user, rooftop);

  const share = await prisma.contentShare.create({
    data: {
      contentAssetId: input.contentAssetId,
      rooftopId: input.rooftopId,
      contactId: input.contactId,
      sharedById: associateId,
      sharedAt: new Date(),
    },
  });

  await emitSignal({
    type: "content.shared",
    payload: { contentShareId: share.id, contentAssetId: input.contentAssetId, rooftopId: input.rooftopId },
    sourceModule: "enablement-content",
    entityType: "ContentShare",
    entityId: share.id,
  });
  await recordAuditEvent({
    actor: user,
    action: "content.shared",
    entityType: "ContentShare",
    entityId: share.id,
    after: { contentAssetId: input.contentAssetId, rooftopId: input.rooftopId },
  });

  revalidatePath(`/accounts/${input.rooftopId}`);
  return share;
}

// Delegates to the canonical implementation in the pricing-exceptions module
// (spec principle 4: approvals-triggering logic is a service, not
// reimplemented per module) — Account 360's dialog just supplies the
// rooftop-context inputs. A "use server" file may only export async
// functions, not re-export bindings, hence the thin wrapper.
export async function startExceptionRequest(input: {
  rooftopId: string;
  contactId: string | null;
  requestType: "RATE_EXCEPTION" | "PROGRAM_TIER_CHANGE" | "TERM_EXTENSION" | "FEE_WAIVER";
  dollarAmount: number;
  rationale: string;
}) {
  return submitExceptionRequest(input);
}

// Delegates to the canonical implementation in the closing-deals module
// (spec principle 4) — a "use server" file can only export async function
// declarations, not re-export bindings, hence the thin wrapper.
export async function createOpportunity(input: {
  rooftopId: string;
  productType: "FINANCING" | "SOFTWARE";
  expectedValue: number;
  closeDate: string;
}) {
  const result = await canonicalCreateOpportunity(input);
  revalidatePath(`/accounts/${input.rooftopId}`);
  return result;
}
