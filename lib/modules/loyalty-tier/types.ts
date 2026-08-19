export type TierWorklistRow = {
  rooftopId: string;
  rooftopName: string;
  dealerGroupName: string;
  tierName: string;
  tierLevel: number;
  evaluatedAt: string;
  reasonCodes: string[];
  thresholdDistance: number;
  downTierRisk: boolean;
  estimatedDollarImpact: number | null;
  dealerVisibleAt: string | null;
};
