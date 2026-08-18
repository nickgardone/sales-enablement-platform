"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can, scopeFilter } from "@/lib/platform/entitlements";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";

const MODULE_ID = "lead-routing";

export async function updateLeadStatus(leadId: string, status: "IN_PROGRESS" | "CONVERTED" | "LOST") {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Lead Routing access required.");

  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const lead = await prisma.lead.findFirst({ where: { id: leadId, rooftop: rooftopWhere } });
  if (!lead) throw new Error("Lead not found or outside your scope.");

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { status, workedAt: lead.workedAt ?? new Date() },
  });

  await emitSignal({
    type: "lead.status.changed",
    payload: { leadId, rooftopId: lead.rooftopId, fromStatus: lead.status, toStatus: status },
    sourceModule: MODULE_ID,
    entityType: "Lead",
    entityId: leadId,
  });
  await recordAuditEvent({
    actor: user,
    action: "lead.status_changed",
    entityType: "Lead",
    entityId: leadId,
    before: { status: lead.status },
    after: { status: updated.status },
  });

  revalidatePath("/leads");
}
