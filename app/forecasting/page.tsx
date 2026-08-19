import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getForecastForUser } from "@/lib/modules/forecasting/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("forecasting-pipeline");
  if (!allowed) return <AccessRestricted moduleName="Forecasting" role={user.role} />;

  const forecast = await getForecastForUser(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forecasting</h1>
        <p className="text-sm text-muted-foreground">Your team&apos;s territory — weighted pipeline rollup over open opportunities.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open opportunities" value={forecast.openOpportunityCount} />
        <StatCard label="Total pipeline value" value={`$${Math.round(forecast.totalPipelineValue).toLocaleString()}`} />
        <StatCard label="Weighted forecast" value={`$${Math.round(forecast.weightedForecast).toLocaleString()}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">By stage</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Opportunities</TableHead>
                <TableHead>Pipeline value</TableHead>
                <TableHead>Weighted value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast.byStage.map((s) => (
                <TableRow key={s.stageName}>
                  <TableCell className="font-medium">{s.stageName}</TableCell>
                  <TableCell className="tabular-nums">{s.probability}%</TableCell>
                  <TableCell className="tabular-nums">{s.opportunityCount}</TableCell>
                  <TableCell className="tabular-nums">${Math.round(s.totalValue).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">${Math.round(s.weightedValue).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {forecast.byStage.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No open opportunities in scope.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">By expected close month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Opportunities</TableHead>
                <TableHead>Pipeline value</TableHead>
                <TableHead>Weighted value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast.byMonth.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium">{m.monthLabel}</TableCell>
                  <TableCell className="tabular-nums">{m.opportunityCount}</TableCell>
                  <TableCell className="tabular-nums">${Math.round(m.totalValue).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">${Math.round(m.weightedValue).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {forecast.byMonth.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No open opportunities in scope.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
