import { Badge } from "@/components/ui/badge";
import type { RooftopHeader } from "@/lib/modules/dealer-account-360/types";

export function AccountHeader({ header }: { header: RooftopHeader }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{header.name}</h1>
          <Badge variant="outline">{header.franchiseType === "FRANCHISE" ? header.oemBrand ?? "Franchise" : "Independent"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {header.dealerGroupName} &middot; {header.region} &middot; {header.territoryName}
        </p>
      </div>
      <div className="text-right text-sm">
        <p className="text-muted-foreground">Assigned associate</p>
        <p className="font-medium">{header.assignedAssociateName ?? "Unassigned"}</p>
      </div>
    </div>
  );
}
