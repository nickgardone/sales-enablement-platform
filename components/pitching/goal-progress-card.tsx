import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import type { GoalProgress } from "@/lib/modules/pitching/types";

export function GoalProgressCard({ label, goal }: { label: string; goal: GoalProgress | null }) {
  if (!goal) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No goal set for this period.</p>
        </CardContent>
      </Card>
    );
  }

  const pct = Math.min(100, Math.round((goal.achievedCount / goal.targetCount) * 100));
  const periodLabel = new Date(goal.period).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-semibold tabular-nums">
            {goal.achievedCount}
            <span className="text-base font-normal text-muted-foreground"> / {goal.targetCount}</span>
          </p>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <Progress value={pct}>
          <ProgressTrack>
            <ProgressIndicator style={{ width: `${pct}%` }} />
          </ProgressTrack>
        </Progress>
        {goal.productFocus && <p className="text-xs text-muted-foreground">Focus: {goal.productFocus === "FINANCING" ? "Financing" : "Software"}</p>}
      </CardContent>
    </Card>
  );
}
