import Link from "next/link";
import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { MetricCard } from "@/components/shared/metric-card";
import { GoalProgressCard } from "@/components/pitching/goal-progress-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getInsightsRollup } from "@/lib/modules/performance-insights/queries";
import { getPitchGoalProgress } from "@/lib/modules/pitching/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("performance-insights");
  if (!allowed) return <AccessRestricted moduleName="Performance & Insights" role={user.role} />;

  const [rollup, goals] = await Promise.all([getInsightsRollup(user), getPitchGoalProgress(user)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance & Insights</h1>
        <p className="text-sm text-muted-foreground">
          {rollup.scopeLabel} — {rollup.rooftopCount} rooftops.
        </p>
      </div>

      {(goals.individual || goals.team) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {user.role !== "ADMIN" && <GoalProgressCard label="Your monthly pitch goal" goal={goals.individual} />}
          {user.role === "SALES_LEADER" && <GoalProgressCard label="Team monthly pitch goal" goal={goals.team} />}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {rollup.metrics.map((m) => (
          <MetricCard key={m.key} label={m.label} value={m.value} unit={m.unit} source="COMPUTED" asOf={m.asOf} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Dealer-outcome metrics by rooftop</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rooftop</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Relationship Health</TableHead>
                <TableHead>Funded Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rollup.rooftopBreakdown.map((r) => (
                <TableRow key={r.rooftopId}>
                  <TableCell className="font-medium">
                    <Link href={`/accounts/${r.rooftopId}`} className="hover:underline">
                      {r.rooftopName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.dealerGroupName}</div>
                  </TableCell>
                  <TableCell>{r.tierName ? <Badge variant="secondary">{r.tierName}</Badge> : "—"}</TableCell>
                  <TableCell className="tabular-nums">{r.relationshipHealth !== null ? r.relationshipHealth.toFixed(0) : "—"}</TableCell>
                  <TableCell className="tabular-nums">${r.fundedVolume.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {rollup.rooftopBreakdown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No rooftops in scope.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {rollup.associateBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{user.role === "ADMIN" ? "By associate (company-wide)" : "By associate (my team)"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Associate</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Pitches</TableHead>
                  <TableHead>Funded Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rollup.associateBreakdown.map((a) => (
                  <TableRow key={a.associateId}>
                    <TableCell className="font-medium">{a.associateName}</TableCell>
                    <TableCell className="tabular-nums">{a.applicationsSubmitted}</TableCell>
                    <TableCell className="tabular-nums">{a.pitchCount}</TableCell>
                    <TableCell className="tabular-nums">${a.fundedVolume.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
