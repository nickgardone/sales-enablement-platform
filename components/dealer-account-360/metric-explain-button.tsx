"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { explainMetric } from "@/lib/services/assistant/actions";
import type { MetricExplanation } from "@/lib/services/assistant/types";

/**
 * The explainMetric intent's UI hook (spec Section 11's guided-transparency
 * pattern): what the metric means and what to do about it, not just the
 * number. Fetches lazily on first open, cached for the life of the popover.
 */
export function MetricExplainButton({ metricKey, rooftopId }: { metricKey: string; rooftopId: string }) {
  const [result, setResult] = useState<MetricExplanation | "error" | null>(null);
  const [isPending, startTransition] = useTransition();

  function load() {
    if (result) return;
    startTransition(async () => {
      try {
        const res = await explainMetric(metricKey, rooftopId);
        setResult(res.output);
      } catch {
        setResult("error");
      }
    });
  }

  return (
    <Popover onOpenChange={(open) => open && load()}>
      <PopoverTrigger
        render={<Button variant="ghost" size="sm" className="absolute top-2 right-2 h-5 w-5 p-0 text-violet-600 hover:text-violet-700 dark:text-violet-400" />}
      >
        <Sparkles className="h-3 w-3" />
        <span className="sr-only">Explain this metric</span>
      </PopoverTrigger>
      <PopoverContent className="w-72 border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/40">
        <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-violet-700 uppercase dark:text-violet-300">
          <Sparkles className="h-3 w-3" /> Assistant
        </div>
        {isPending && <p className="text-xs text-muted-foreground">Thinking...</p>}
        {result === "error" && <p className="text-xs text-destructive">Couldn&apos;t generate an explanation.</p>}
        {result && result !== "error" && (
          <div className="space-y-1.5 text-xs">
            <p className="font-medium">
              {result.metricLabel}: {result.currentValueLabel}
            </p>
            <p>{result.whatItMeans}</p>
            <p className="text-muted-foreground">{result.whatToDoAboutIt}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
