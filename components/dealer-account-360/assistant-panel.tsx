import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NextActionSuggestion } from "@/lib/services/assistant/types";

const PRIORITY_VARIANT: Record<NextActionSuggestion["priority"], "destructive" | "secondary" | "outline"> = {
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

/**
 * Renders the summarizeAccount + suggestNextAction intents (spec Section 11).
 * Assistant output must be visually distinguishable from system-of-record
 * data — hence the tinted card, rather than reusing the plain Card styling
 * every other pane on this page uses.
 */
export function AssistantPanel({
  summary,
  suggestions,
  citationCount,
}: {
  summary: string;
  suggestions: NextActionSuggestion[];
  citationCount: number;
}) {
  return (
    <Card className="border-violet-200 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-violet-700 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" /> Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{summary}</p>
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Suggested next actions</p>
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-md border bg-background p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{s.action}</p>
                <Badge variant={PRIORITY_VARIANT[s.priority]} className="shrink-0 text-[9px]">
                  {s.priority}
                </Badge>
              </div>
              <p className="mt-0.5 text-muted-foreground">{s.rationale}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Based on {citationCount} record{citationCount === 1 ? "" : "s"} from this account.
        </p>
      </CardContent>
    </Card>
  );
}
