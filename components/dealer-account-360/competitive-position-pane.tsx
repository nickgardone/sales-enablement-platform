"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CompetitivePositionRow } from "@/lib/modules/dealer-account-360/types";

const COLORS = ["var(--color-primary)", "#f59e0b", "#0ea5e9", "#a855f7", "#64748b"];

export function CompetitivePositionPane({ rows }: { rows: CompetitivePositionRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Competitive Position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No lender-mix data yet for this account.</p>
        </CardContent>
      </Card>
    );
  }

  const weekCount = rows[0].points.length;
  const chartData = Array.from({ length: weekCount }, (_, i) => {
    const point: Record<string, string | number> = { asOf: rows[0].points[i].asOf };
    for (const row of rows) point[row.slug] = row.points[i]?.sharePct ?? 0;
    return point;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Competitive Position</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {rows.map((r, i) => (
            <Badge key={r.slug} variant="outline" className="gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {r.label} &middot; {r.latestSharePct.toFixed(1)}%
            </Badge>
          ))}
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="asOf"
                tickFormatter={(v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} unit="%" />
              <Tooltip
                labelFormatter={(label) => (typeof label === "string" ? new Date(label).toLocaleDateString() : "")}
                formatter={(value, name) => [
                  typeof value === "number" ? `${value.toFixed(1)}%` : String(value),
                  rows.find((r) => r.slug === name)?.label ?? String(name),
                ]}
              />
              {rows.map((r, i) => (
                <Area
                  key={r.slug}
                  type="monotone"
                  dataKey={r.slug}
                  stackId="1"
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
