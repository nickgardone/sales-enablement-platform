export type CrossSellStatus = "OPEN" | "DISMISSED" | "ACTIONED";
export type ProductType = "FINANCING" | "SOFTWARE";

export type CrossSellRow = {
  id: string;
  rooftopId: string;
  rooftopName: string;
  dealerGroupName: string;
  assignedAssociateName: string | null;
  missingProduct: ProductType;
  confidence: number | null;
  status: CrossSellStatus;
  identifiedAt: string;
  actionedAt: string | null;
};
