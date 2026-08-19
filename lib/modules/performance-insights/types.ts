export type RollupMetric = {
  key: string;
  label: string;
  value: number;
  unit: "count" | "currency" | "days" | "percent";
  asOf: string;
};

export type RooftopBreakdownRow = {
  rooftopId: string;
  rooftopName: string;
  dealerGroupName: string;
  fundedVolume: number;
  relationshipHealth: number | null;
  tierName: string | null;
};

export type AssociateBreakdownRow = {
  associateId: string;
  associateName: string;
  applicationsSubmitted: number;
  fundedVolume: number;
  pitchCount: number;
};

export type InsightsRollup = {
  scopeLabel: string;
  rooftopCount: number;
  metrics: RollupMetric[];
  rooftopBreakdown: RooftopBreakdownRow[];
  associateBreakdown: AssociateBreakdownRow[] | null;
};
