import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { CrossSellRow } from "./types";

const MODULE_ID = "cross-sell";

export async function getCrossSellSignalsForUser(user: CurrentUser): Promise<CrossSellRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const signals = await prisma.crossSellSignal.findMany({
    where: { rooftop: rooftopWhere },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } }, assignedAssociate: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: [{ status: "asc" }, { identifiedAt: "desc" }],
  });

  return signals.map((s) => ({
    id: s.id,
    rooftopId: s.rooftopId,
    rooftopName: s.rooftop.name,
    dealerGroupName: s.rooftop.dealerGroup.name,
    assignedAssociateName: s.rooftop.assignedAssociate?.user.name ?? null,
    missingProduct: s.missingProduct,
    confidence: s.confidence,
    status: s.status,
    identifiedAt: s.identifiedAt.toISOString(),
    actionedAt: s.actionedAt?.toISOString() ?? null,
  }));
}
