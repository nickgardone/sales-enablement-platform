import { prisma } from "@/lib/prisma";
import { can } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import {
  getActivityTimeline,
  getCompetitivePosition,
  getContactsByPersona,
  getPerformanceTrend,
  getRooftopHeader,
  getTierPanel,
} from "@/lib/modules/dealer-account-360/queries";
import type { MetricSeries } from "@/lib/modules/dealer-account-360/types";
import { getContentAssets } from "@/lib/modules/enablement-content/queries";
import { getIntakeContext } from "@/lib/modules/pricing-exceptions/queries";
import {
  draftExceptionJustification as draftTemplate,
  explainMetric as explainTemplate,
  generateVisitBrief as visitBriefTemplate,
  summarizeAccount as summarizeTemplate,
  suggestNextAction as suggestTemplate,
} from "./provider";
import type {
  AssistantResult,
  Citation,
  ExceptionJustificationDraft,
  MetricExplanation,
  NextActionSuggestion,
  VisitBrief,
} from "./types";

/**
 * Data-fetching + entitlement layer for the assistant's five typed intents
 * (spec Section 11). Every intent reads through the same module query
 * functions the modules themselves use — never re-derives account data — and
 * hands a plain, already-formatted input object to the mock provider in
 * provider.ts. Swapping in a real model later means changing that provider
 * call, not this file.
 */

const REQUEST_TYPE_LABELS: Record<string, string> = {
  RATE_EXCEPTION: "Rate exception",
  PROGRAM_TIER_CHANGE: "Program tier change",
  TERM_EXTENSION: "Term extension",
  FEE_WAIVER: "Fee waiver",
};

const METRIC_KNOWLEDGE: Record<string, { whatItMeans: string; goodDirection: "up" | "down" }> = {
  applications_submitted: {
    whatItMeans:
      "The number of credit applications this rooftop has submitted through us recently — a leading indicator of how much paper they're sending our way.",
    goodDirection: "up",
  },
  funded_volume: {
    whatItMeans: "Total dollar volume of deals this rooftop has funded with us — the bottom-line measure of the relationship's revenue contribution.",
    goodDirection: "up",
  },
  funding_cycle_time_days: {
    whatItMeans: "Average days from application submission to funding — how fast we're turning their paper into cash for the dealer.",
    goodDirection: "down",
  },
  look_to_book_rate: {
    whatItMeans:
      "The share of submitted applications that convert into a funded deal — a proxy for how competitive our approval terms are on this rooftop's typical credit mix.",
    goodDirection: "up",
  },
  lead_to_sale_conversion_rate: {
    whatItMeans: "The share of inbound leads at this rooftop that convert to a funded sale — reflects both lead quality and sales execution here.",
    goodDirection: "up",
  },
  relationship_health: {
    whatItMeans: "A composite score of engagement, funded-volume trend, and responsiveness — the overall temperature of this account relationship.",
    goodDirection: "up",
  },
};

function envelope<T>(output: T, citations: Citation[]): AssistantResult<T> {
  return { output, citations, generatedAt: new Date().toISOString(), provider: "MOCK_TEMPLATE" };
}

async function requireAccountRead(user: CurrentUser) {
  const allowed = await can(user, "dealer-account-360", "view");
  if (!allowed) throw new Error("Not authorized: Account 360 access required.");
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function formatMetricValue(value: number, unit: MetricSeries["unit"]): string {
  switch (unit) {
    case "currency":
      return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    case "percent":
      return `${value.toFixed(1)}%`;
    case "days":
      return `${value.toFixed(1)}d`;
    case "score":
      return value.toFixed(0);
    default:
      return value.toLocaleString();
  }
}

export async function summarizeAccount(user: CurrentUser, rooftopId: string): Promise<AssistantResult<string>> {
  await requireAccountRead(user);
  const [header, tier, timeline, performance] = await Promise.all([
    getRooftopHeader(rooftopId),
    getTierPanel(rooftopId),
    getActivityTimeline(rooftopId, 30),
    getPerformanceTrend(rooftopId),
  ]);
  if (!header) throw new Error("Account not found.");

  const relationshipHealth = performance.find((s) => s.metricKey === "relationship_health")?.latest?.value ?? null;
  const lastInteraction = timeline.find((i) => i.kind === "INTERACTION") ?? null;

  const summary = summarizeTemplate({
    rooftopName: header.name,
    dealerGroupName: header.dealerGroupName,
    assignedAssociateName: header.assignedAssociateName,
    tierName: tier.currentTier?.name ?? null,
    downTierRisk: tier.downTierRisk,
    relationshipHealth,
    lastInteractionDaysAgo: daysAgo(lastInteraction?.occurredAt ?? null),
    recentActivityCount: timeline.length,
  });

  const citations: Citation[] = [{ entityType: "Rooftop", entityId: rooftopId, label: header.name }];
  if (tier.history[0]) citations.push({ entityType: "TierEvaluation", entityId: tier.history[0].id, label: `Tier evaluation — ${tier.history[0].tierName}` });
  if (lastInteraction) citations.push({ entityType: lastInteraction.kind, entityId: lastInteraction.id, label: lastInteraction.title });

  return envelope(summary, citations);
}

export async function generateVisitBrief(user: CurrentUser, rooftopId: string, contactPersona: string): Promise<AssistantResult<VisitBrief>> {
  await requireAccountRead(user);
  const [header, tier, performance, competitive, contactGroups, timeline, contentAssets] = await Promise.all([
    getRooftopHeader(rooftopId),
    getTierPanel(rooftopId),
    getPerformanceTrend(rooftopId),
    getCompetitivePosition(rooftopId),
    getContactsByPersona(rooftopId),
    getActivityTimeline(rooftopId, 5),
    getContentAssets(),
  ]);
  if (!header) throw new Error("Account not found.");

  const contact = contactGroups.find((g) => g.persona === contactPersona)?.contacts[0] ?? null;
  const topMetricsSeries = performance.filter((s) => s.latest).slice(0, 3);
  const topLender = competitive[0] ?? null;
  const suggestedContent = contentAssets.filter((a) => a.personaTags.includes(contactPersona)).slice(0, 2);

  const sections = visitBriefTemplate({
    rooftopName: header.name,
    dealerGroupName: header.dealerGroupName,
    franchiseType: header.franchiseType,
    region: header.region,
    contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
    contactPersona,
    talkTrack: contact?.talkTrack ?? null,
    tierName: tier.currentTier?.name ?? null,
    downTierRisk: tier.downTierRisk,
    estimatedDollarImpact: tier.estimatedDollarImpact,
    topMetrics: topMetricsSeries.map((s) => ({ label: s.label, valueLabel: formatMetricValue(s.latest!.value, s.unit) })),
    topLenderLabel: topLender?.label ?? null,
    topLenderSharePct: topLender?.latestSharePct ?? null,
    recentActivityTitles: timeline.map((t) => t.title),
    suggestedContentTitles: suggestedContent.map((a) => a.title),
  });

  const brief: VisitBrief = {
    rooftopName: header.name,
    dealerGroupName: header.dealerGroupName,
    contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
    contactPersona,
    sections,
  };

  const citations: Citation[] = [{ entityType: "Rooftop", entityId: rooftopId, label: header.name }];
  if (contact) citations.push({ entityType: "Contact", entityId: contact.id, label: `${contact.firstName} ${contact.lastName}` });
  if (tier.history[0]) citations.push({ entityType: "TierEvaluation", entityId: tier.history[0].id, label: `Tier evaluation — ${tier.history[0].tierName}` });
  for (const s of topMetricsSeries) citations.push({ entityType: "MetricSnapshot", entityId: `${s.metricKey}:${rooftopId}`, label: s.label });
  for (const a of suggestedContent) citations.push({ entityType: "ContentAsset", entityId: a.id, label: a.title });
  for (const t of timeline) citations.push({ entityType: t.kind, entityId: t.id, label: t.title });

  return envelope(brief, citations);
}

export async function explainMetric(user: CurrentUser, metricKey: string, rooftopId: string): Promise<AssistantResult<MetricExplanation>> {
  await requireAccountRead(user);
  const [header, performance] = await Promise.all([getRooftopHeader(rooftopId), getPerformanceTrend(rooftopId)]);
  if (!header) throw new Error("Account not found.");

  const series = performance.find((s) => s.metricKey === metricKey);
  const knowledge = METRIC_KNOWLEDGE[metricKey];
  if (!series || !series.latest || !knowledge) throw new Error(`No data available for metric "${metricKey}" on this account.`);

  const points = series.points;
  const latestPoint = points[points.length - 1];
  const priorPoint = points.length > 1 ? points[points.length - 2] : null;
  let trend: "up" | "down" | "flat" | "unknown" = "unknown";
  if (priorPoint) {
    const delta = latestPoint.value - priorPoint.value;
    const threshold = 0.01 * Math.max(1, Math.abs(priorPoint.value));
    trend = Math.abs(delta) < threshold ? "flat" : delta > 0 ? "up" : "down";
  }

  const { whatItMeans, whatToDoAboutIt } = explainTemplate({
    metricLabel: series.label,
    currentValueLabel: formatMetricValue(series.latest.value, series.unit),
    goodDirection: knowledge.goodDirection,
    trend,
    whatItMeans: knowledge.whatItMeans,
  });

  const explanation: MetricExplanation = {
    metricKey,
    metricLabel: series.label,
    currentValueLabel: formatMetricValue(series.latest.value, series.unit),
    whatItMeans,
    whatToDoAboutIt,
  };

  const citations: Citation[] = [
    { entityType: "MetricSnapshot", entityId: `${metricKey}:${rooftopId}:${latestPoint.asOf}`, label: `${series.label} — ${new Date(latestPoint.asOf).toLocaleDateString()}` },
  ];
  if (priorPoint) {
    citations.push({
      entityType: "MetricSnapshot",
      entityId: `${metricKey}:${rooftopId}:${priorPoint.asOf}`,
      label: `${series.label} — ${new Date(priorPoint.asOf).toLocaleDateString()}`,
    });
  }

  return envelope(explanation, citations);
}

export async function suggestNextAction(user: CurrentUser, rooftopId: string): Promise<AssistantResult<NextActionSuggestion[]>> {
  await requireAccountRead(user);
  const [header, tier, timeline, crossSellSignals, pendingExceptions, followUpPitches, openEscalations] = await Promise.all([
    getRooftopHeader(rooftopId),
    getTierPanel(rooftopId),
    getActivityTimeline(rooftopId, 30),
    prisma.crossSellSignal.findMany({ where: { rooftopId, status: "OPEN" }, select: { id: true, missingProduct: true } }),
    prisma.exceptionRequest.findMany({ where: { rooftopId, approvalRequest: { status: "PENDING" } }, select: { id: true } }),
    prisma.pitch.findMany({ where: { rooftopId, outcome: "FOLLOW_UP_NEEDED" }, select: { id: true } }),
    prisma.escalation.findMany({ where: { rooftopId, status: { not: "RESOLVED" } }, select: { id: true } }),
  ]);
  if (!header) throw new Error("Account not found.");

  const lastInteraction = timeline.find((i) => i.kind === "INTERACTION") ?? null;

  const suggestions = suggestTemplate({
    downTierRisk: tier.downTierRisk,
    dealerVisibleAt: tier.dealerVisibleAt,
    estimatedDollarImpact: tier.estimatedDollarImpact,
    lastInteractionDaysAgo: daysAgo(lastInteraction?.occurredAt ?? null),
    openCrossSellLabels: crossSellSignals.map((s) => (s.missingProduct === "FINANCING" ? "Financing" : "Software")),
    pendingExceptionCount: pendingExceptions.length,
    followUpNeededPitchCount: followUpPitches.length,
    openEscalationCount: openEscalations.length,
  });

  const citations: Citation[] = [{ entityType: "Rooftop", entityId: rooftopId, label: header.name }];
  if (tier.downTierRisk && tier.history[0]) {
    citations.push({ entityType: "TierEvaluation", entityId: tier.history[0].id, label: `Tier evaluation — ${tier.history[0].tierName}` });
  }
  for (const s of crossSellSignals) citations.push({ entityType: "CrossSellSignal", entityId: s.id, label: `${s.missingProduct === "FINANCING" ? "Financing" : "Software"} opportunity` });
  for (const e of pendingExceptions) citations.push({ entityType: "ExceptionRequest", entityId: e.id, label: "Pending exception request" });
  for (const p of followUpPitches) citations.push({ entityType: "Pitch", entityId: p.id, label: "Follow-up needed pitch" });
  for (const e of openEscalations) citations.push({ entityType: "Escalation", entityId: e.id, label: "Open escalation" });

  return envelope(suggestions, citations);
}

export async function draftExceptionJustification(user: CurrentUser, draft: ExceptionJustificationDraft): Promise<AssistantResult<string>> {
  const allowed = await can(user, "pricing-exceptions", "view");
  if (!allowed) throw new Error("Not authorized: Pricing Exceptions access required.");

  const [header, tier, intake, performance] = await Promise.all([
    getRooftopHeader(draft.rooftopId),
    getTierPanel(draft.rooftopId),
    getIntakeContext(draft.rooftopId),
    getPerformanceTrend(draft.rooftopId),
  ]);
  if (!header) throw new Error("Account not found.");

  const relationshipHealth = performance.find((s) => s.metricKey === "relationship_health")?.latest?.value ?? null;
  const recentApprovedCount = intake.recentHistory.filter((h) => h.status === "APPROVED").length;
  const recentRejectedCount = intake.recentHistory.filter((h) => h.status === "REJECTED").length;

  const justification = draftTemplate({
    rooftopName: header.name,
    requestTypeLabel: REQUEST_TYPE_LABELS[draft.requestType] ?? draft.requestType,
    dollarAmount: draft.dollarAmount,
    tierName: tier.currentTier?.name ?? null,
    relationshipHealth,
    recentApprovedCount,
    recentRejectedCount,
  });

  const citations: Citation[] = [{ entityType: "Rooftop", entityId: draft.rooftopId, label: header.name }];
  if (tier.history[0]) citations.push({ entityType: "TierEvaluation", entityId: tier.history[0].id, label: `Tier evaluation — ${tier.history[0].tierName}` });
  for (const h of intake.recentHistory.slice(0, 3)) {
    citations.push({ entityType: "ExceptionRequest", entityId: h.id, label: `${REQUEST_TYPE_LABELS[h.requestType] ?? h.requestType} — ${h.status ?? "pending"}` });
  }

  return envelope(justification, citations);
}
