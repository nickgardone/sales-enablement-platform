export type OnboardingStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "COMPLETE";
export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ChecklistItem = { label: string; done: boolean };

export type OnboardingCaseRow = {
  id: string;
  rooftopId: string;
  rooftopName: string;
  dealerGroupName: string;
  associateName: string;
  status: OnboardingStatus;
  checklist: ChecklistItem[];
  allItemsDone: boolean;
  approvalStatus: ApprovalRequestStatus | null;
  createdAt: string;
  updatedAt: string;
};
