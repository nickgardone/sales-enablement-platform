import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { LeadListRow } from "./types";

const MODULE_ID = "lead-routing";
const UNWORKED_STATUSES = new Set(["NEW", "ROUTED"]);

export async function getLeadsForUser(user: CurrentUser): Promise<LeadListRow[]> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const leads = await prisma.lead.findMany({
    where: { rooftop: rooftopWhere },
    include: {
      rooftop: { include: { dealerGroup: { select: { name: true } } } },
      routingRule: { select: { name: true } },
      routedAssociate: { include: { user: { select: { name: true } } } },
    },
    orderBy: { receivedAt: "desc" },
  });

  const now = Date.now();
  const rows = leads.map((l): LeadListRow => {
    const isUnworked = UNWORKED_STATUSES.has(l.status);
    const isBreached = l.slaBreachedAt !== null || (isUnworked && l.slaDueAt.getTime() < now);
    return {
      id: l.id,
      rooftopName: l.rooftop.name,
      dealerGroupName: l.rooftop.dealerGroup.name,
      consumerName: l.consumerName,
      source: l.source,
      productInterest: l.productInterest,
      status: l.status,
      routedAssociateName: l.routedAssociate?.user.name ?? null,
      ruleName: l.routingRule?.name ?? null,
      reasonCodes: (l.reasonCodes as Record<string, unknown> | null) ?? null,
      receivedAt: l.receivedAt.toISOString(),
      slaDueAt: l.slaDueAt.toISOString(),
      slaBreachedAt: l.slaBreachedAt?.toISOString() ?? null,
      isBreached,
      isUnworked,
      ageHours: Math.round((now - l.receivedAt.getTime()) / 3600000),
    };
  });

  // Unworked-lead aging view: oldest unworked leads surface first, then everything else newest-first.
  return rows.sort((a, b) => {
    if (a.isUnworked !== b.isUnworked) return a.isUnworked ? -1 : 1;
    if (a.isUnworked) return b.ageHours - a.ageHours;
    return b.receivedAt.localeCompare(a.receivedAt);
  });
}
