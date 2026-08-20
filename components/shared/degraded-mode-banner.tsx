"use client";

import { CloudOff } from "lucide-react";
import { useDegradedMode } from "./degraded-mode-context";

export function DegradedModeBanner() {
  const { isDegraded } = useDegradedMode();
  if (!isDegraded) return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 print:hidden">
      <CloudOff className="size-3.5 shrink-0" />
      <span>
        <strong className="font-medium">Degraded mode</strong> — simulating a source-system outage. Live metrics show last-known values, and new writes are
        queued locally until it&apos;s restored.
      </span>
    </div>
  );
}
