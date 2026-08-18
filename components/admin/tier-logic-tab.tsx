import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type LoyaltyTierRow = {
  id: string;
  name: string;
  level: number;
  minThreshold: unknown;
  description: string | null;
};

// Read-only viewer — "tier logic must be inspectable in the admin console"
// (spec Section 10.5). Editing tier logic isn't in scope until Loyalty Tier
// Management (Phase 7) defines what a safe edit surface looks like.
export function TierLogicTab({ tiers }: { tiers: LoyaltyTierRow[] }) {
  const sorted = [...tiers].sort((a, b) => a.level - b.level);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sorted.map((tier) => (
        <Card key={tier.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{tier.name}</CardTitle>
            <Badge variant="secondary">Level {tier.level}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(tier.minThreshold, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
