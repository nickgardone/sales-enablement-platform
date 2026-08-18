import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type {
  ActivityTimelineItem,
  CompetitivePositionRow,
  ContactRow,
  MetricSeries,
  PersonaContactGroup,
  RooftopHeader,
  RooftopListRow,
  TierPanelData,
} from "./types";

const MODULE_ID = "dealer-account-360";

const METRIC_META: Record<string, { label: string; unit: MetricSeries["unit"] }> = {
  applications_submitted: { label: "Applications Submitted", unit: "count" },
  funded_volume: { label: "Funded Volume", unit: "currency" },
  funding_cycle_time_days: { label: "Funding Cycle Time", unit: "days" },
  look_to_book_rate: { label: "Look-to-Book Rate", unit: "percent" },
  lead_to_sale_conversion_rate: { label: "Lead-to-Sale Conversion", unit: "percent" },
  relationship_health: { label: "Relationship Health", unit: "score" },
};
const PERFORMANCE_METRIC_KEYS = Object.keys(METRIC_META);

const LENDER_LABELS: Record<string, string> = {
  us: "Demo Lender (Us)",
  regional_credit_union: "Regional Credit Union",
  captive_oem_finance: "Captive OEM Finance",
  national_finance_co: "National Finance Co.",
  other: "Other / Buy-Here-Pay-Here",
};

/** Scoped account list for /accounts — associates see their book, leaders see their team's territory. */
export async function getRooftopListForUser(user: CurrentUser): Promise<RooftopListRow[]> {
  const where = await scopeFilter(user, "Rooftop", MODULE_ID);
  const rooftops = await prisma.rooftop.findMany({
    where,
    include: {
      dealerGroup: { select: { name: true } },
      assignedAssociate: { include: { user: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  if (rooftops.length === 0) return [];

  const rooftopIds = rooftops.map((r) => r.id);
  const [latestTierByRooftop, lastInteractionByRooftop, healthByRooftop] = await Promise.all([
    latestTierEvaluationsByRooftop(rooftopIds),
    lastInteractionAtByRooftop(rooftopIds),
    latestMetricByRooftop(rooftopIds, "relationship_health"),
  ]);

  return rooftops.map((r) => {
    const tierEval = latestTierByRooftop.get(r.id);
    return {
      id: r.id,
      name: r.name,
      dealerGroupName: r.dealerGroup.name,
      region: r.region,
      franchiseType: r.franchiseType,
      oemBrand: r.oemBrand,
      assignedAssociateName: r.assignedAssociate?.user.name ?? null,
      currentTier: tierEval?.tierName ?? null,
      downTierRisk: tierEval?.downTierRisk ?? false,
      relationshipHealth: healthByRooftop.get(r.id) ?? null,
      lastInteractionAt: lastInteractionByRooftop.get(r.id)?.toISOString() ?? null,
    };
  });
}

export async function getRooftopHeader(rooftopId: string): Promise<RooftopHeader | null> {
  const rooftop = await prisma.rooftop.findUnique({
    where: { id: rooftopId },
    include: {
      dealerGroup: { select: { id: true, name: true } },
      territory: { select: { name: true } },
      assignedAssociate: { include: { user: { select: { name: true } } } },
    },
  });
  if (!rooftop) return null;

  return {
    id: rooftop.id,
    name: rooftop.name,
    dealerGroupId: rooftop.dealerGroup.id,
    dealerGroupName: rooftop.dealerGroup.name,
    region: rooftop.region,
    franchiseType: rooftop.franchiseType,
    oemBrand: rooftop.oemBrand,
    territoryName: rooftop.territory.name,
    assignedAssociateName: rooftop.assignedAssociate?.user.name ?? null,
    createdAt: rooftop.createdAt.toISOString(),
  };
}

/** Rooftop contacts grouped by persona, plus the group-level (rooftopId=null) principal. */
export async function getContactsByPersona(rooftopId: string): Promise<PersonaContactGroup[]> {
  const rooftop = await prisma.rooftop.findUnique({ where: { id: rooftopId }, select: { dealerGroupId: true } });
  if (!rooftop) return [];

  const [contacts, playbooks, interactions] = await Promise.all([
    prisma.contact.findMany({
      where: { dealerGroupId: rooftop.dealerGroupId, OR: [{ rooftopId }, { rooftopId: null }] },
      orderBy: [{ personaType: "asc" }, { lastName: "asc" }],
    }),
    prisma.playbook.findMany({ select: { contactPersona: true, title: true } }),
    prisma.interaction.findMany({
      where: { rooftopId },
      orderBy: { occurredAt: "desc" },
      select: { contactId: true, occurredAt: true },
    }),
  ]);

  const lastInteractionByContact = new Map<string, Date>();
  for (const i of interactions) {
    if (i.contactId && !lastInteractionByContact.has(i.contactId)) {
      lastInteractionByContact.set(i.contactId, i.occurredAt);
    }
  }
  const playbookTitleByPersona = new Map<string, string>();
  for (const p of playbooks) {
    if (!playbookTitleByPersona.has(p.contactPersona)) playbookTitleByPersona.set(p.contactPersona, p.title);
  }

  const groups = new Map<string, ContactRow[]>();
  for (const c of contacts) {
    const row: ContactRow = {
      id: c.id,
      personaType: c.personaType,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      isGroupLevel: c.rooftopId === null,
      lastInteractionAt: lastInteractionByContact.get(c.id)?.toISOString() ?? null,
      talkTrack: playbookTitleByPersona.get(c.personaType) ?? null,
    };
    const arr = groups.get(c.personaType) ?? [];
    arr.push(row);
    groups.set(c.personaType, arr);
  }

  return Array.from(groups.entries()).map(([persona, personaContacts]) => ({ persona, contacts: personaContacts }));
}

/** 90-day trended core metrics (spec principle 6: every value carries source + as-of). */
export async function getPerformanceTrend(rooftopId: string): Promise<MetricSeries[]> {
  const rows = await prisma.metricSnapshot.findMany({
    where: { entityType: "ROOFTOP", entityId: rooftopId, metricKey: { in: PERFORMANCE_METRIC_KEYS } },
    orderBy: { asOf: "asc" },
  });

  const byKey = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byKey.get(r.metricKey) ?? [];
    arr.push(r);
    byKey.set(r.metricKey, arr);
  }

  return PERFORMANCE_METRIC_KEYS.filter((k) => byKey.has(k)).map((key) => {
    const points = byKey.get(key)!;
    const latest = points[points.length - 1];
    return {
      metricKey: key,
      label: METRIC_META[key].label,
      unit: METRIC_META[key].unit,
      latest: latest
        ? { value: latest.value, asOf: latest.asOf.toISOString(), source: latest.source, freshnessSeconds: latest.freshnessSeconds }
        : null,
      points: points.map((p) => ({ asOf: p.asOf.toISOString(), value: p.value, source: p.source })),
    };
  });
}

/** Lender mix / competitive position, trended — the "who else is financing this rooftop" view. */
export async function getCompetitivePosition(rooftopId: string): Promise<CompetitivePositionRow[]> {
  const rows = await prisma.metricSnapshot.findMany({
    where: { entityType: "ROOFTOP", entityId: rooftopId, metricKey: { startsWith: "lender_share:" } },
    orderBy: { asOf: "asc" },
  });

  const byLender = new Map<string, typeof rows>();
  for (const r of rows) {
    const slug = r.metricKey.slice("lender_share:".length);
    const arr = byLender.get(slug) ?? [];
    arr.push(r);
    byLender.set(slug, arr);
  }

  return Array.from(byLender.entries())
    .map(([slug, points]) => ({
      slug,
      label: LENDER_LABELS[slug] ?? slug,
      latestSharePct: points[points.length - 1]?.value ?? 0,
      points: points.map((p) => ({ asOf: p.asOf.toISOString(), sharePct: p.value })),
    }))
    .sort((a, b) => b.latestSharePct - a.latestSharePct);
}

/** Current loyalty tier + full evaluation history with explainable reason codes (spec principle 7). */
export async function getTierPanel(rooftopId: string): Promise<TierPanelData> {
  const evaluations = await prisma.tierEvaluation.findMany({
    where: { rooftopId },
    include: { tier: true },
    orderBy: { evaluatedAt: "desc" },
  });
  const current = evaluations[0] ?? null;

  return {
    currentTier: current ? { name: current.tier.name, level: current.tier.level } : null,
    downTierRisk: current?.downTierRisk ?? false,
    estimatedDollarImpact: current?.estimatedDollarImpact ?? null,
    dealerVisibleAt: current?.dealerVisibleAt?.toISOString() ?? null,
    history: evaluations.map((e) => ({
      id: e.id,
      tierName: e.tier.name,
      tierLevel: e.tier.level,
      evaluatedAt: e.evaluatedAt.toISOString(),
      reasonCodes: (e.reasonCodes as string[]) ?? [],
      thresholdDistance: e.thresholdDistance,
      downTierRisk: e.downTierRisk,
      estimatedDollarImpact: e.estimatedDollarImpact,
      dealerVisibleAt: e.dealerVisibleAt?.toISOString() ?? null,
    })),
  };
}

/** Unified activity feed merging every module's touches on this rooftop, newest first. */
export async function getActivityTimeline(rooftopId: string, limit = 60): Promise<ActivityTimelineItem[]> {
  const [interactions, pitches, exceptions, escalations, shares, tierEvals] = await Promise.all([
    prisma.interaction.findMany({
      where: { rooftopId },
      include: { contact: true, associate: { include: { user: true } } },
      orderBy: { occurredAt: "desc" },
      take: limit,
    }),
    prisma.pitch.findMany({
      where: { rooftopId },
      include: { contact: true, associate: { include: { user: true } } },
      orderBy: { occurredAt: "desc" },
      take: limit,
    }),
    prisma.exceptionRequest.findMany({
      where: { rooftopId },
      include: { associate: { include: { user: true } }, approvalRequest: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.escalation.findMany({
      where: { rooftopId },
      include: { raisedBy: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.contentShare.findMany({
      where: { rooftopId },
      include: { contentAsset: true, sharedBy: { include: { user: true } } },
      orderBy: { sharedAt: "desc" },
      take: limit,
    }),
    prisma.tierEvaluation.findMany({
      where: { rooftopId },
      include: { tier: true },
      orderBy: { evaluatedAt: "desc" },
      take: limit,
    }),
  ]);

  const items: ActivityTimelineItem[] = [
    ...interactions.map((i): ActivityTimelineItem => ({
      id: i.id,
      kind: "INTERACTION",
      occurredAt: i.occurredAt.toISOString(),
      title: i.contact
        ? `${i.type.charAt(0) + i.type.slice(1).toLowerCase()} with ${i.contact.firstName} ${i.contact.lastName}`
        : `${i.type.charAt(0) + i.type.slice(1).toLowerCase()} logged`,
      detail: i.notes,
      actorName: i.associate.user.name,
    })),
    ...pitches.map((p): ActivityTimelineItem => ({
      id: p.id,
      kind: "PITCH",
      occurredAt: p.occurredAt.toISOString(),
      title: `Pitched ${p.productPitched === "FINANCING" ? "Financing" : "Software"} to ${p.contact.firstName} ${p.contact.lastName} — ${p.outcome.replace(/_/g, " ").toLowerCase()}`,
      detail: p.objection,
      actorName: p.associate.user.name,
    })),
    ...exceptions.map((e): ActivityTimelineItem => ({
      id: e.id,
      kind: "EXCEPTION_REQUEST",
      occurredAt: e.createdAt.toISOString(),
      title: `${e.requestType.replace(/_/g, " ").toLowerCase()} requested${e.dollarAmount ? ` — $${e.dollarAmount.toLocaleString()}` : ""}`,
      detail: e.approvalRequest ? `Approval status: ${e.approvalRequest.status}` : e.rationale,
      actorName: e.associate.user.name,
    })),
    ...escalations.map((e): ActivityTimelineItem => ({
      id: e.id,
      kind: "ESCALATION",
      occurredAt: e.createdAt.toISOString(),
      title: `Escalation — ${e.category} (${e.status.replace(/_/g, " ").toLowerCase()})`,
      detail: e.resolutionNotes ?? e.description,
      actorName: e.raisedBy.name,
    })),
    ...shares.map((s): ActivityTimelineItem => ({
      id: s.id,
      kind: "CONTENT_SHARE",
      occurredAt: s.sharedAt.toISOString(),
      title: `Shared "${s.contentAsset.title}"`,
      detail: null,
      actorName: s.sharedBy.user.name,
    })),
    ...tierEvals.map((t): ActivityTimelineItem => ({
      id: t.id,
      kind: "TIER_EVALUATION",
      occurredAt: t.evaluatedAt.toISOString(),
      title: `Tier evaluation — ${t.tier.name}${t.downTierRisk ? " (down-tier risk flagged)" : ""}`,
      detail: ((t.reasonCodes as string[]) ?? []).join(", ") || null,
      actorName: null,
    })),
  ];

  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, limit);
}

/** Flat content-library options for the "share content" dialog. */
export async function getContentAssetOptions() {
  return prisma.contentAsset.findMany({
    select: { id: true, title: true, assetType: true },
    orderBy: { title: "asc" },
  });
}

// ---------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------

async function latestTierEvaluationsByRooftop(rooftopIds: string[]) {
  const evaluations = await prisma.tierEvaluation.findMany({
    where: { rooftopId: { in: rooftopIds } },
    include: { tier: { select: { name: true } } },
    orderBy: { evaluatedAt: "desc" },
  });
  const byRooftop = new Map<string, { tierName: string; downTierRisk: boolean }>();
  for (const e of evaluations) {
    if (!byRooftop.has(e.rooftopId)) byRooftop.set(e.rooftopId, { tierName: e.tier.name, downTierRisk: e.downTierRisk });
  }
  return byRooftop;
}

async function lastInteractionAtByRooftop(rooftopIds: string[]) {
  const interactions = await prisma.interaction.findMany({
    where: { rooftopId: { in: rooftopIds } },
    select: { rooftopId: true, occurredAt: true },
    orderBy: { occurredAt: "desc" },
  });
  const byRooftop = new Map<string, Date>();
  for (const i of interactions) {
    if (!byRooftop.has(i.rooftopId)) byRooftop.set(i.rooftopId, i.occurredAt);
  }
  return byRooftop;
}

async function latestMetricByRooftop(rooftopIds: string[], metricKey: string) {
  const rows = await prisma.metricSnapshot.findMany({
    where: { entityType: "ROOFTOP", entityId: { in: rooftopIds }, metricKey },
    select: { entityId: true, value: true, asOf: true },
    orderBy: { asOf: "desc" },
  });
  const byRooftop = new Map<string, number>();
  for (const r of rows) {
    if (!byRooftop.has(r.entityId)) byRooftop.set(r.entityId, r.value);
  }
  return byRooftop;
}
