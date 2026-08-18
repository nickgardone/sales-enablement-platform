export type ExceptionRequestType = "RATE_EXCEPTION" | "PROGRAM_TIER_CHANGE" | "TERM_EXTENSION" | "FEE_WAIVER";
export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ApprovalStepStatus = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED" | "DELEGATED";
export type UserRole = "SALES_ASSOCIATE" | "SALES_LEADER" | "ADMIN";

export type ExceptionListRow = {
  id: string;
  rooftopName: string;
  dealerGroupName: string;
  requestType: ExceptionRequestType;
  dollarAmount: number | null;
  status: ApprovalRequestStatus;
  policyName: string;
  submittedAt: string;
  decidedAt: string | null;
  slaDueAt: string;
  isBreached: boolean;
  requestedByName: string;
};

export type ApprovalStepRow = {
  id: string;
  stepOrder: number;
  approverRole: UserRole;
  status: ApprovalStepStatus;
  decidedAt: string | null;
  deciderName: string | null;
  delegatedToName: string | null;
  rationale: string | null;
};

export type ExceptionDetail = {
  id: string;
  rooftopId: string;
  rooftopName: string;
  dealerGroupName: string;
  contactName: string | null;
  requestType: ExceptionRequestType;
  requestedTerms: Record<string, unknown>;
  rationale: string;
  dollarAmount: number | null;
  currentProgramName: string | null;
  rateSheetSummary: string | null;
  requestedByName: string;
  submittedAt: string;
  updatedAt: string;
  approvalRequest: {
    id: string;
    status: ApprovalRequestStatus;
    policyName: string;
    reasonCodes: Record<string, unknown>;
    slaHours: number;
    requestedAt: string;
    decidedAt: string | null;
    deciderName: string | null;
    decisionRationale: string | null;
    steps: ApprovalStepRow[];
    activeStep: ApprovalStepRow | null;
  } | null;
  outcome: {
    fundedAmount: number;
    fundedAt: string;
  } | null;
};

export type ApproverQueueRow = {
  exceptionRequestId: string;
  approvalRequestId: string;
  stepId: string;
  rooftopName: string;
  requestType: ExceptionRequestType;
  dollarAmount: number | null;
  policyName: string;
  requestedByName: string;
  requestedAt: string;
  slaDueAt: string;
  isBreached: boolean;
  hoursWaiting: number;
};

export type RooftopOption = { id: string; name: string; dealerGroupName: string };
export type ContactOption = { id: string; rooftopId: string; name: string; personaType: string };

export type IntakeContext = {
  currentProgramName: string;
  rateSheetSummary: string | null;
  recentHistory: {
    id: string;
    requestType: ExceptionRequestType;
    dollarAmount: number | null;
    status: ApprovalRequestStatus | null;
    submittedAt: string;
  }[];
};
