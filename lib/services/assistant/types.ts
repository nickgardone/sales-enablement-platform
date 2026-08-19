export type Citation = {
  entityType: string;
  entityId: string;
  label: string;
};

/**
 * Common envelope for every assistant intent (spec Section 11): output must
 * cite the records it drew from and must be visually distinguishable from
 * system-of-record data. `provider` is the seam agentic mode swaps later —
 * v1 is always "MOCK_TEMPLATE".
 */
export type AssistantResult<T> = {
  output: T;
  citations: Citation[];
  generatedAt: string;
  provider: "MOCK_TEMPLATE";
};

export type VisitBriefSection = { heading: string; body: string };

export type VisitBrief = {
  rooftopName: string;
  dealerGroupName: string;
  contactName: string | null;
  contactPersona: string;
  sections: VisitBriefSection[];
};

export type MetricExplanation = {
  metricKey: string;
  metricLabel: string;
  currentValueLabel: string;
  whatItMeans: string;
  whatToDoAboutIt: string;
};

export type NextActionPriority = "HIGH" | "MEDIUM" | "LOW";

export type NextActionSuggestion = {
  action: string;
  rationale: string;
  priority: NextActionPriority;
};

export type ExceptionJustificationDraft = {
  rooftopId: string;
  requestType: "RATE_EXCEPTION" | "PROGRAM_TIER_CHANGE" | "TERM_EXTENSION" | "FEE_WAIVER";
  dollarAmount: number;
};
