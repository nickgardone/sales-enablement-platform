import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { AssociateBreakdownRow, InsightsRollup, RollupMetric, RooftopBreakdownRow } from "./types";

const MODULE_ID = "performance-insights";

async function latestMetricByRooftop(rooftopIds: string[], metricKey: string) {
  const rows = await prisma.metricSnapshot.findMany({
    where: { entityType: "ROOFTOP", entityId: { in: rooftopIds }, metricKey },
    select: { entityId: true, value: true },
    orderBy: { asOf: "desc" },
  });
  const byRooftop = new Map<string, number>();
  for (const r of rows) if (!byRooftop.has(r.entityId)) byRooftop.set(r.entityId, r.value);
  return byRooftop;
}

async function latestTierByRooftop(rooftopIds: string[]) {
  const evaluations = await prisma.tierEvaluation.findMany({
    where: { rooftopId: { in: rooftopIds } },
    include: { tier: { select: { name: true } } },
    orderBy: { evaluatedAt: "desc" },
  });
  const byRooftop = new Map<string, string>();
  for (const e of evaluations) if (!byRooftop.has(e.rooftopId)) byRooftop.set(e.rooftopId, e.tier.name);
  return byRooftop;
}

/**
 * Scoped performance rollup: associate sees "my book," leader sees "my team/territory,"
 * admin sees the exec-style GLOBAL rollup — all off the same underlying tables (spec
 * principle 2). Aggregates are reported as COMPUTED (fresh, just-in-time), distinct from
 * the individually-sourced LIVE/LEGACY_BATCH MetricSnapshot values shown in Account 360.
 */
export async function getInsightsRollup(user: CurrentUser): Promise<InsightsRollup> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rooftops = await prisma.rooftop.findMany({
    where: rooftopWhere,
    include: { dealerGroup: { select: { name: true } } },
  });
  const rooftopIds = rooftops.map((r) => r.id);
  const now = new Date();

  if (rooftopIds.length === 0) {
    return {
      scopeLabel: user.role === "ADMIN" ? "Company-wide" : user.role === "SALES_LEADER" ? "Your team's territory" : "Your book",
      rooftopCount: 0,
      metrics: [],
      rooftopBreakdown: [],
      associateBreakdown: null,
    };
  }

  const [applications, fundedDeals, pitches, leads, healthByRooftop, tierByRooftop] = await Promise.all([
    prisma.application.findMany({
      where: { rooftopId: { in: rooftopIds } },
      select: { id: true, rooftopId: true, opportunity: { select: { associateId: true } } },
    }),
    prisma.fundedDeal.findMany({
      where: { application: { rooftopId: { in: rooftopIds } } },
      select: {
        fundedAmount: true,
        fundingCycleTimeDays: true,
        application: { select: { rooftopId: true, opportunity: { select: { associateId: true } } } },
      },
    }),
    prisma.pitch.findMany({ where: { rooftopId: { in: rooftopIds } }, select: { associateId: true } }),
    prisma.lead.findMany({ where: { rooftopId: { in: rooftopIds } }, select: { status: true } }),
    latestMetricByRooftop(rooftopIds, "relationship_health"),
    latestTierByRooftop(rooftopIds),
  ]);

  const applicationsSubmitted = applications.length;
  const fundedVolume = fundedDeals.reduce((sum, f) => sum + f.fundedAmount, 0);
  const fundedCount = fundedDeals.length;
  const avgCycleTime =
    fundedDeals.filter((f) => f.fundingCycleTimeDays !== null).length > 0
      ? fundedDeals.reduce((sum, f) => sum + (f.fundingCycleTimeDays ?? 0), 0) / fundedDeals.filter((f) => f.fundingCycleTimeDays !== null).length
      : 0;
  const lookToBookRate = applicationsSubmitted > 0 ? (fundedCount / applicationsSubmitted) * 100 : 0;
  const convertedLeads = leads.filter((l) => l.status === "CONVERTED").length;
  const leadConversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

  const metrics: RollupMetric[] = [
    { key: "applications_submitted", label: "Applications Submitted", value: applicationsSubmitted, unit: "count", asOf: now.toISOString() },
    { key: "funded_volume", label: "Funded Volume", value: fundedVolume, unit: "currency", asOf: now.toISOString() },
    { key: "funding_cycle_time_days", label: "Avg Funding Cycle Time", value: avgCycleTime, unit: "days", asOf: now.toISOString() },
    { key: "look_to_book_rate", label: "Look-to-Book Rate", value: lookToBookRate, unit: "percent", asOf: now.toISOString() },
    { key: "pitches_logged", label: "Pitches Logged", value: pitches.length, unit: "count", asOf: now.toISOString() },
    { key: "lead_conversion_rate", label: "Lead Conversion Rate", value: leadConversionRate, unit: "percent", asOf: now.toISOString() },
  ];

  const fundedByRooftop = new Map<string, number>();
  for (const f of fundedDeals) {
    const rid = f.application.rooftopId;
    fundedByRooftop.set(rid, (fundedByRooftop.get(rid) ?? 0) + f.fundedAmount);
  }
  const rooftopBreakdown: RooftopBreakdownRow[] = rooftops
    .map((r) => ({
      rooftopId: r.id,
      rooftopName: r.name,
      dealerGroupName: r.dealerGroup.name,
      fundedVolume: fundedByRooftop.get(r.id) ?? 0,
      relationshipHealth: healthByRooftop.get(r.id) ?? null,
      tierName: tierByRooftop.get(r.id) ?? null,
    }))
    .sort((a, b) => b.fundedVolume - a.fundedVolume)
    .slice(0, 15);

  let associateBreakdown: AssociateBreakdownRow[] | null = null;
  if (user.role === "SALES_LEADER" || user.role === "ADMIN") {
    const associateIds = new Set<string>();
    for (const a of applications) if (a.opportunity?.associateId) associateIds.add(a.opportunity.associateId);
    for (const f of fundedDeals) if (f.application.opportunity?.associateId) associateIds.add(f.application.opportunity.associateId);
    for (const p of pitches) associateIds.add(p.associateId);

    const associates = await prisma.associate.findMany({
      where: { id: { in: Array.from(associateIds) } },
      include: { user: { select: { name: true } } },
    });

    associateBreakdown = associates
      .map((a) => ({
        associateId: a.id,
        associateName: a.user.name,
        applicationsSubmitted: applications.filter((app) => app.opportunity?.associateId === a.id).length,
        fundedVolume: fundedDeals.filter((f) => f.application.opportunity?.associateId === a.id).reduce((sum, f) => sum + f.fundedAmount, 0),
        pitchCount: pitches.filter((p) => p.associateId === a.id).length,
      }))
      .sort((a, b) => b.fundedVolume - a.fundedVolume);
  }

  return {
    scopeLabel: user.role === "ADMIN" ? "Company-wide" : user.role === "SALES_LEADER" ? "Your team's territory" : "Your book",
    rooftopCount: rooftops.length,
    metrics,
    rooftopBreakdown,
    associateBreakdown,
  };
}
