import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { TierWorklistRow } from "./types";

const MODULE_ID = "loyalty-tier";

/** Latest tier evaluation per scoped rooftop, at-risk accounts sorted first. */
export async function getTierWorklistForUser(user: CurrentUser): Promise<TierWorklistRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rooftops = await prisma.rooftop.findMany({
    where: rooftopWhere,
    include: { dealerGroup: { select: { name: true } } },
  });
  const rooftopIds = rooftops.map((r) => r.id);
  if (rooftopIds.length === 0) return [];

  const evaluations = await prisma.tierEvaluation.findMany({
    where: { rooftopId: { in: rooftopIds } },
    include: { tier: true },
    orderBy: { evaluatedAt: "desc" },
  });

  const latestByRooftop = new Map<string, (typeof evaluations)[number]>();
  for (const e of evaluations) {
    if (!latestByRooftop.has(e.rooftopId)) latestByRooftop.set(e.rooftopId, e);
  }

  const rows: TierWorklistRow[] = [];
  for (const r of rooftops) {
    const evaluation = latestByRooftop.get(r.id);
    if (!evaluation) continue;
    rows.push({
      rooftopId: r.id,
      rooftopName: r.name,
      dealerGroupName: r.dealerGroup.name,
      tierName: evaluation.tier.name,
      tierLevel: evaluation.tier.level,
      evaluatedAt: evaluation.evaluatedAt.toISOString(),
      reasonCodes: (evaluation.reasonCodes as string[]) ?? [],
      thresholdDistance: evaluation.thresholdDistance,
      downTierRisk: evaluation.downTierRisk,
      estimatedDollarImpact: evaluation.estimatedDollarImpact,
      dealerVisibleAt: evaluation.dealerVisibleAt?.toISOString() ?? null,
    });
  }

  return rows.sort((a, b) => {
    if (a.downTierRisk !== b.downTierRisk) return a.downTierRisk ? -1 : 1;
    return a.thresholdDistance - b.thresholdDistance;
  });
}
