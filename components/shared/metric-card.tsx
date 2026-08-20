"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDegradedMode } from "@/components/shared/degraded-mode-context";
import { cn } from "@/lib/utils";

export type MetricCardUnit = "count" | "currency" | "days" | "percent" | "score";
export type MetricCardSource = "LIVE" | "LEGACY_BATCH" | "COMPUTED";

export type MetricCardProps = {
  label: string;
  value: number;
  unit?: MetricCardUnit;
  source: MetricCardSource;
  asOf: string;
  delta?: number | null;
  className?: string;
};

function formatValue(value: number, unit?: MetricCardUnit) {
  switch (unit) {
    case "currency":
      return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    case "percent":
      return `${value.toFixed(1)}%`;
    case "days":
      return `${value.toFixed(1)}d`;
    case "score":
      return value.toFixed(0);
    default:
      return value.toLocaleString();
  }
}

const SOURCE_LABEL: Record<MetricCardSource, string> = {
  LIVE: "Live",
  LEGACY_BATCH: "Legacy batch",
  COMPUTED: "Computed",
};

/**
 * The spec's principle-6 component: every rendered metric shows source + as-of,
 * not just a number — freshness is data, not UI dressing. Every module surfacing
 * a MetricSnapshot value should render it through this rather than a bare number.
 */
export function MetricCard({ label, value, unit, source, asOf, delta, className }: MetricCardProps) {
  const { isDegraded } = useDegradedMode();
  // While simulating an outage, a LIVE source can't actually be trusted as live
  // anymore — show it as a cached last-known value instead of hiding it.
  const showAsCached = isDegraded && source === "LIVE";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums">{formatValue(value, unit)}</p>
          {delta !== undefined && delta !== null && Math.abs(delta) > 0.01 && (
            <span className={cn("text-xs font-medium tabular-nums", delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {delta > 0 ? "+" : ""}
              {formatValue(delta, unit)}
            </span>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger className="inline-flex">
            <Badge
              variant={showAsCached ? "outline" : source === "LIVE" ? "secondary" : "outline"}
              className={cn("text-[10px] font-normal", showAsCached && "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400")}
            >
              {showAsCached ? "Cached (was live)" : SOURCE_LABEL[source]} &middot; {formatDistanceToNow(new Date(asOf), { addSuffix: true })}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {showAsCached
              ? `Live source unreachable in degraded mode — showing the last known value as of ${new Date(asOf).toLocaleString()}.`
              : `As of ${new Date(asOf).toLocaleString()}`}
          </TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
