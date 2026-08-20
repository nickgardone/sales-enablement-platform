import { formatDealerVisibility } from "@/lib/platform/dealer-visibility";
import type { NextActionSuggestion, VisitBriefSection } from "./types";

/**
 * The deterministic mock provider (spec Section 11): pure templating over data
 * the caller already assembled — no DB access, no randomness, no external API
 * calls. This is the seam: agentic mode later swaps this module for a real
 * model call behind the same shape, with intents.ts (the data-fetching layer)
 * unchanged.
 */

export type SummarizeAccountInput = {
  rooftopName: string;
  dealerGroupName: string;
  assignedAssociateName: string | null;
  tierName: string | null;
  downTierRisk: boolean;
  relationshipHealth: number | null;
  lastInteractionDaysAgo: number | null;
  recentActivityCount: number;
};

export function summarizeAccount(input: SummarizeAccountInput): string {
  const parts: string[] = [];
  parts.push(
    `${input.rooftopName} (${input.dealerGroupName}) is ${input.assignedAssociateName ? `assigned to ${input.assignedAssociateName}` : "unassigned"}${input.tierName ? `, currently in the ${input.tierName} loyalty tier` : ""}.`
  );
  if (input.downTierRisk) {
    parts.push("This account is flagged for down-tier risk — worth addressing before the dealer sees it reflected in their standing.");
  }
  if (input.relationshipHealth !== null) {
    const band = input.relationshipHealth >= 75 ? "strong" : input.relationshipHealth >= 50 ? "moderate" : "weak";
    parts.push(`Relationship health is ${band} at ${input.relationshipHealth.toFixed(0)}/100.`);
  }
  if (input.lastInteractionDaysAgo === null) {
    parts.push("No interactions have been logged yet for this account.");
  } else if (input.lastInteractionDaysAgo > 30) {
    parts.push(`It's been ${input.lastInteractionDaysAgo} days since the last logged interaction — this account is going cold.`);
  } else {
    parts.push(`Last touchpoint was ${input.lastInteractionDaysAgo} day${input.lastInteractionDaysAgo === 1 ? "" : "s"} ago.`);
  }
  parts.push(`${input.recentActivityCount} activity record${input.recentActivityCount === 1 ? "" : "s"} on file.`);
  return parts.join(" ");
}

export type VisitBriefInput = {
  rooftopName: string;
  dealerGroupName: string;
  franchiseType: string;
  region: string;
  contactName: string | null;
  contactPersona: string;
  talkTrack: string | null;
  tierName: string | null;
  downTierRisk: boolean;
  estimatedDollarImpact: number | null;
  topMetrics: { label: string; valueLabel: string }[];
  topLenderLabel: string | null;
  topLenderSharePct: number | null;
  recentActivityTitles: string[];
  suggestedContentTitles: string[];
};

const PERSONA_OPENERS: Record<string, string> = {
  DEALER_PRINCIPAL: "Lead with strategic commitments and the store's overall standing — this conversation is about the relationship, not line items.",
  GENERAL_MANAGER: "Frame this around store P&L impact — funded volume, cycle time, and how we compare to the other lenders on their lot.",
  SALES_DESK_MANAGER: "Keep it tactical — lead volume, look-to-book, and what's converting versus stalling in the pipeline.",
  FI_MANAGER: "Focus on routing volume and reserve — this is the conversation about which deals come to us versus a competitor.",
  BDC_MANAGER: "Center it on lead quality and speed to contact — this persona owns how fast inbound interest turns into an appointment.",
  INTERNET_MANAGER: "Talk digital lead flow and online-to-showroom conversion — this persona cares about what's working before a customer ever walks in.",
};

export function generateVisitBrief(input: VisitBriefInput): VisitBriefSection[] {
  const sections: VisitBriefSection[] = [];

  sections.push({
    heading: "Account snapshot",
    body: `${input.rooftopName} — ${input.dealerGroupName}, ${input.franchiseType.toLowerCase()}, ${input.region}.${input.tierName ? ` Current tier: ${input.tierName}${input.downTierRisk ? " (down-tier risk flagged" + (input.estimatedDollarImpact ? `, est. $${Math.round(input.estimatedDollarImpact).toLocaleString()} impact` : "") + ")" : ""}.` : ""}`,
  });

  sections.push({
    heading: `Talking to: ${input.contactName ?? "no contact on file"} (${input.contactPersona.replace(/_/g, " ").toLowerCase()})`,
    body: [
      PERSONA_OPENERS[input.contactPersona] ?? "Keep the conversation grounded in what this persona cares about day to day.",
      input.talkTrack ? `Suggested talk track: ${input.talkTrack}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  });

  if (input.topMetrics.length > 0) {
    sections.push({
      heading: "Performance to reference",
      body: input.topMetrics.map((m) => `${m.label}: ${m.valueLabel}`).join(" · "),
    });
  }

  if (input.topLenderLabel) {
    sections.push({
      heading: "Competitive position",
      body: `${input.topLenderLabel} currently holds the largest share of this rooftop's paper at ${input.topLenderSharePct?.toFixed(0)}%. Use this to frame where we're winning or losing volume.`,
    });
  }

  if (input.recentActivityTitles.length > 0) {
    sections.push({
      heading: "Since your last visit",
      body: input.recentActivityTitles.join("; "),
    });
  } else {
    sections.push({ heading: "Since your last visit", body: "No recent activity logged on this account." });
  }

  if (input.suggestedContentTitles.length > 0) {
    sections.push({
      heading: "Content to bring",
      body: input.suggestedContentTitles.join(", "),
    });
  }

  return sections;
}

export type ExplainMetricInput = {
  metricLabel: string;
  currentValueLabel: string;
  goodDirection: "up" | "down";
  trend: "up" | "down" | "flat" | "unknown";
  whatItMeans: string;
};

export function explainMetric(input: ExplainMetricInput): { whatItMeans: string; whatToDoAboutIt: string } {
  let whatToDoAboutIt: string;
  if (input.trend === "unknown") {
    whatToDoAboutIt = "Not enough history yet to call a trend — treat the current value as a baseline and check back after a few more data points land.";
  } else if (input.trend === "flat") {
    whatToDoAboutIt = "This has been flat recently — not urgent, but worth a check-in with the account to understand why it hasn't moved.";
  } else if (input.trend === input.goodDirection) {
    whatToDoAboutIt = "Trending in the right direction. Worth reinforcing whatever's working — mention it as a positive on your next visit rather than treating it as urgent.";
  } else {
    whatToDoAboutIt = "This is moving the wrong way. Worth raising directly on your next visit, and checking the loyalty tier panel to see if it's connected to broader relationship risk.";
  }
  return { whatItMeans: input.whatItMeans, whatToDoAboutIt };
}

export type SuggestNextActionInput = {
  downTierRisk: boolean;
  dealerVisibleAt: string | null;
  estimatedDollarImpact: number | null;
  lastInteractionDaysAgo: number | null;
  openCrossSellLabels: string[];
  pendingExceptionCount: number;
  followUpNeededPitchCount: number;
  openEscalationCount: number;
};

export function suggestNextAction(input: SuggestNextActionInput): NextActionSuggestion[] {
  const suggestions: NextActionSuggestion[] = [];

  if (input.downTierRisk) {
    suggestions.push({
      action: "Address down-tier risk before it's dealer-visible",
      rationale: input.dealerVisibleAt
        ? `This account is flagged for a tier drop. ${formatDealerVisibility(input.dealerVisibleAt)}${input.estimatedDollarImpact ? ` (est. $${Math.round(input.estimatedDollarImpact).toLocaleString()} impact)` : ""}.`
        : "This account is flagged for down-tier risk.",
      priority: "HIGH",
    });
  }

  if (input.lastInteractionDaysAgo === null || input.lastInteractionDaysAgo > 30) {
    suggestions.push({
      action: "Log a visit or call",
      rationale:
        input.lastInteractionDaysAgo === null
          ? "No interaction has ever been logged for this account."
          : `It's been ${input.lastInteractionDaysAgo} days since the last logged touchpoint.`,
      priority: "HIGH",
    });
  }

  for (const label of input.openCrossSellLabels) {
    suggestions.push({
      action: `Follow up on cross-sell opportunity: ${label}`,
      rationale: "An open cross-sell signal on this rooftop hasn't been actioned yet.",
      priority: "MEDIUM",
    });
  }

  if (input.pendingExceptionCount > 0) {
    suggestions.push({
      action: "Check in on your pending exception request",
      rationale: `${input.pendingExceptionCount} exception request${input.pendingExceptionCount === 1 ? " is" : "s are"} still awaiting a decision.`,
      priority: "MEDIUM",
    });
  }

  if (input.followUpNeededPitchCount > 0) {
    suggestions.push({
      action: "Follow up on an outstanding pitch objection",
      rationale: `${input.followUpNeededPitchCount} logged pitch${input.followUpNeededPitchCount === 1 ? "" : "es"} on this account ${input.followUpNeededPitchCount === 1 ? "was" : "were"} marked follow-up needed.`,
      priority: "MEDIUM",
    });
  }

  if (input.openEscalationCount > 0) {
    suggestions.push({
      action: "Monitor unresolved escalation",
      rationale: `${input.openEscalationCount} escalation${input.openEscalationCount === 1 ? " is" : "s are"} still open on this account.`,
      priority: "LOW",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      action: "No urgent flags — good time for a relationship-building touchpoint",
      rationale: "Tier, exceptions, escalations, and cross-sell are all clear, and the last touchpoint is recent.",
      priority: "LOW",
    });
  }

  const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
}

export type DraftJustificationInput = {
  rooftopName: string;
  requestTypeLabel: string;
  dollarAmount: number;
  tierName: string | null;
  relationshipHealth: number | null;
  recentApprovedCount: number;
  recentRejectedCount: number;
};

export function draftExceptionJustification(input: DraftJustificationInput): string {
  const parts: string[] = [];
  parts.push(`Requesting a ${input.requestTypeLabel.toLowerCase()} of $${Math.round(input.dollarAmount).toLocaleString()} for ${input.rooftopName}.`);
  if (input.tierName) {
    parts.push(`This account is currently in the ${input.tierName} tier${input.relationshipHealth !== null ? ` with a relationship health score of ${input.relationshipHealth.toFixed(0)}/100` : ""}, supporting continued investment in the relationship.`);
  }
  if (input.recentApprovedCount > 0) {
    parts.push(`${input.recentApprovedCount} similar exception${input.recentApprovedCount === 1 ? " was" : "s were"} approved for this account previously without issue.`);
  }
  if (input.recentRejectedCount > 0) {
    parts.push(`Note: ${input.recentRejectedCount} prior request${input.recentRejectedCount === 1 ? " was" : "s were"} rejected — consider addressing that context explicitly.`);
  }
  parts.push("[Edit this draft with the specific business reason before submitting.]");
  return parts.join(" ");
}
