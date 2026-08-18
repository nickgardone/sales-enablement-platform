"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard } from "@/components/shared/metric-card";
import type { MetricSeries } from "@/lib/modules/dealer-account-360/types";

export function PerformancePane({ series }: { series: MetricSeries[] }) {
  const [selectedKey, setSelectedKey] = useState(series[0]?.metricKey ?? "");
  const selected = series.find((s) => s.metricKey === selectedKey) ?? series[0];

  const items = Object.fromEntries(series.map((s) => [s.metricKey, s.label]));

  if (series.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No performance history yet for this account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Performance (90 days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {series.map(
            (s) =>
              s.latest && (
                <MetricCard
                  key={s.metricKey}
                  label={s.label}
                  value={s.latest.value}
                  unit={s.unit}
                  source={s.latest.source}
                  asOf={s.latest.asOf}
                  className="shadow-none"
                />
              )
          )}
        </div>

        <div className="space-y-2">
          <Select items={items} value={selectedKey} onValueChange={(v) => typeof v === "string" && setSelectedKey(v)}>
            <SelectTrigger size="sm" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {series.map((s) => (
                <SelectItem key={s.metricKey} value={s.metricKey}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected && (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selected.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="asOf"
                    tickFormatter={(v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    labelFormatter={(label) => (typeof label === "string" ? new Date(label).toLocaleDateString() : "")}
                    formatter={(value) => [typeof value === "number" ? value.toLocaleString() : String(value), selected.label]}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
