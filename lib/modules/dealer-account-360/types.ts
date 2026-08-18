export type RooftopListRow = {
  id: string;
  name: string;
  dealerGroupName: string;
  region: string;
  franchiseType: string;
  oemBrand: string | null;
  assignedAssociateName: string | null;
  currentTier: string | null;
  downTierRisk: boolean;
  relationshipHealth: number | null;
  lastInteractionAt: string | null;
};

export type RooftopHeader = {
  id: string;
  name: string;
  dealerGroupId: string;
  dealerGroupName: string;
  region: string;
  franchiseType: string;
  oemBrand: string | null;
  territoryName: string;
  assignedAssociateName: string | null;
  createdAt: string;
};

export type ContactRow = {
  id: string;
  personaType: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isGroupLevel: boolean;
  lastInteractionAt: string | null;
  talkTrack: string | null;
};

export type PersonaContactGroup = {
  persona: string;
  contacts: ContactRow[];
};

export type MetricSource = "LIVE" | "LEGACY_BATCH" | "COMPUTED";

export type MetricSeriesPoint = { asOf: string; value: number; source: MetricSource };

export type MetricSeries = {
  metricKey: string;
  label: string;
  unit: "count" | "currency" | "days" | "percent" | "score";
  latest: { value: number; asOf: string; source: MetricSource; freshnessSeconds: number } | null;
  points: MetricSeriesPoint[];
};

export type CompetitivePositionRow = {
  slug: string;
  label: string;
  latestSharePct: number;
  points: { asOf: string; sharePct: number }[];
};

export type TierEvaluationRow = {
  id: string;
  tierName: string;
  tierLevel: number;
  evaluatedAt: string;
  reasonCodes: string[];
  thresholdDistance: number;
  downTierRisk: boolean;
  estimatedDollarImpact: number | null;
  dealerVisibleAt: string | null;
};

export type TierPanelData = {
  currentTier: { name: string; level: number } | null;
  downTierRisk: boolean;
  estimatedDollarImpact: number | null;
  dealerVisibleAt: string | null;
  history: TierEvaluationRow[];
};

export type ActivityTimelineKind =
  | "INTERACTION"
  | "PITCH"
  | "EXCEPTION_REQUEST"
  | "ESCALATION"
  | "CONTENT_SHARE"
  | "TIER_EVALUATION";

export type ActivityTimelineItem = {
  id: string;
  kind: ActivityTimelineKind;
  occurredAt: string;
  title: string;
  detail: string | null;
  actorName: string | null;
};
