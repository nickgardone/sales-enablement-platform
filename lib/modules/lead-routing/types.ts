export type LeadStatus = "NEW" | "ROUTED" | "IN_PROGRESS" | "CONVERTED" | "LOST";
export type ProductType = "FINANCING" | "SOFTWARE";

export type LeadListRow = {
  id: string;
  rooftopName: string;
  dealerGroupName: string;
  consumerName: string;
  source: string;
  productInterest: ProductType;
  status: LeadStatus;
  routedAssociateName: string | null;
  ruleName: string | null;
  reasonCodes: Record<string, unknown> | null;
  receivedAt: string;
  slaDueAt: string;
  slaBreachedAt: string | null;
  isBreached: boolean;
  isUnworked: boolean;
  ageHours: number;
};
