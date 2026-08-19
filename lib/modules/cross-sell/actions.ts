"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/platform/current-user";
import { can, scopeFilter } from "@/lib/platform/entitlements";
import { recordAuditEvent } from "@/lib/services/audit";
import { emitSignal } from "@/lib/services/signals";

const MODULE_ID = "cross-sell";

export async function updateCrossSellStatus(signalId: string, status: "DISMISSED" | "ACTIONED") {
  const user = await getCurrentUser();
  const allowed = await can(user, MODULE_ID, "view");
  if (!allowed) throw new Error("Not authorized: Cross-Sell access required.");

  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const signal = await prisma.crossSellSignal.findFirst({ where: { id: signalId, rooftop: rooftopWhere } });
  if (!signal) throw new Error("Cross-sell signal not found or outside your scope.");
  if (signal.status !== "OPEN") throw new Error("This signal has already been worked.");

  const updated = await prisma.crossSellSignal.update({
    where: { id: signalId },
    data: { status, actionedAt: new Date() },
  });

  await emitSignal({
    type: "crosssell.status_changed",
    payload: { crossSellSignalId: signalId, rooftopId: signal.rooftopId, status },
    sourceModule: MODULE_ID,
    entityType: "CrossSellSignal",
    entityId: signalId,
  });
  await recordAuditEvent({
    actor: user,
    action: "crosssell.status_changed",
    entityType: "CrossSellSignal",
    entityId: signalId,
    before: { status: "OPEN" },
    after: { status: updated.status },
  });

  revalidatePath("/cross-sell");
}
