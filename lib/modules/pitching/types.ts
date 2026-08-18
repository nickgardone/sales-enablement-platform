export type ProductType = "FINANCING" | "SOFTWARE";
export type PitchOutcome = "POSITIVE" | "NEUTRAL" | "DECLINED" | "FOLLOW_UP_NEEDED";

export type PitchListRow = {
  id: string;
  rooftopName: string;
  dealerGroupName: string;
  contactName: string;
  associateName: string;
  productPitched: ProductType;
  outcome: PitchOutcome;
  objection: string | null;
  occurredAt: string;
};

export type GoalProgress = {
  period: string;
  targetCount: number;
  achievedCount: number;
  productFocus: ProductType | null;
};

export type RooftopOption = { id: string; name: string; dealerGroupName: string };
export type ContactOption = { id: string; rooftopId: string; name: string; personaType: string };
