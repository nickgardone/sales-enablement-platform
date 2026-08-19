export type EscalationStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EscalationRow = {
  id: string;
  rooftopId: string;
  rooftopName: string;
  dealerGroupName: string;
  raisedByName: string;
  category: string;
  description: string;
  status: EscalationStatus;
  approvalStatus: ApprovalRequestStatus | null;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type RooftopOption = { id: string; name: string; dealerGroupName: string };
