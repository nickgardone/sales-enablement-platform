import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDealerVisibility } from "@/lib/platform/dealer-visibility";
import type { TierPanelData } from "@/lib/modules/dealer-account-360/types";

export function TierPanel({ data }: { data: TierPanelData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Loyalty Tier</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {data.currentTier ? (
            <Badge variant="secondary" className="text-sm">
              {data.currentTier.name} &middot; Level {data.currentTier.level}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Not yet evaluated</span>
          )}
          {data.downTierRisk && (
            <Badge variant="destructive" className="text-sm">
              Down-tier risk
            </Badge>
          )}
        </div>

        {data.downTierRisk && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
            <p className="font-medium text-destructive">
              {data.estimatedDollarImpact ? `Est. ${Math.round(data.estimatedDollarImpact).toLocaleString()} at risk` : "Tier at risk"}
            </p>
            {data.dealerVisibleAt && <p className="mt-0.5 text-muted-foreground">{formatDealerVisibility(data.dealerVisibleAt)}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Evaluation history</p>
          {data.history.length === 0 && <p className="text-sm text-muted-foreground">No evaluations yet.</p>}
          {data.history.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
              <div>
                <p className="font-medium">{h.tierName}</p>
                <p className="text-muted-foreground">{formatDistanceToNow(new Date(h.evaluatedAt), { addSuffix: true })}</p>
              </div>
              <Popover>
                <PopoverTrigger render={<Button variant="ghost" size="sm" className="h-6 text-xs" />}>Why?</PopoverTrigger>
                <PopoverContent className="w-64 text-xs">
                  <p className="font-medium">Reason codes</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {h.reasonCodes.map((code) => (
                      <li key={code}>{code.replace(/_/g, " ").toLowerCase()}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-muted-foreground">
                    Threshold distance: {h.thresholdDistance >= 0 ? "+" : ""}
                    {Math.round(h.thresholdDistance).toLocaleString()}
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
