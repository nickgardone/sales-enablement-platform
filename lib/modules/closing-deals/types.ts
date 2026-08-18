export type ProductType = "FINANCING" | "SOFTWARE";
export type ApplicationStatus = "SUBMITTED" | "IN_UNDERWRITING" | "CONDITIONALLY_APPROVED" | "APPROVED" | "DECLINED" | "FUNDED";
export type StipStatus = "OUTSTANDING" | "CLEARED" | "WAIVED";

export type DealStageOption = {
  id: string;
  name: string;
  sortOrder: number;
  isClosed: boolean;
  isWon: boolean;
};

export type OpportunityListRow = {
  id: string;
  rooftopName: string;
  dealerGroupName: string;
  associateName: string;
  productType: ProductType;
  stageName: string;
  stageId: string;
  isClosed: boolean;
  isWon: boolean;
  expectedValue: number;
  closeDate: string;
  applicationStatus: ApplicationStatus | null;
  outstandingStipCount: number;
};

export type StipRow = {
  id: string;
  description: string;
  status: StipStatus;
  ownerName: string;
  agingDays: number;
  clearedAt: string | null;
};

export type OpportunityDetail = {
  id: string;
  rooftopId: string;
  rooftopName: string;
  dealerGroupName: string;
  associateName: string;
  productType: ProductType;
  stageId: string;
  stageName: string;
  isClosed: boolean;
  isWon: boolean;
  expectedValue: number;
  closeDate: string;
  createdAt: string;
  application: {
    id: string;
    status: ApplicationStatus;
    submittedAt: string;
    stips: StipRow[];
  } | null;
  fundedDeal: {
    fundedAmount: number;
    fundedAt: string;
    fundingCycleTimeDays: number | null;
  } | null;
};

export type RooftopOption = { id: string; name: string; dealerGroupName: string };
