"use client";

import { formatDistanceToNow } from "date-fns";
import { CloudOff, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDegradedMode } from "./degraded-mode-context";

export function DegradedModeToggle() {
  const { isDegraded, toggle, queue, syncNow } = useDegradedMode();

  return (
    <div className="flex items-center gap-1">
      {queue.length > 0 && (
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400" />}>
            <CloudOff className="size-3.5" />
            {queue.length} queued
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Queued writes</p>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => void syncNow()}>
                  <RefreshCw className="size-3" /> Sync now
                </Button>
              </div>
              <ul className="space-y-1.5">
                {queue.map((item) => (
                  <li key={item.id} className="rounded-md border bg-muted/40 p-2 text-xs">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground">Queued {formatDistanceToNow(new Date(item.queuedAt), { addSuffix: true })}</p>
                  </li>
                ))}
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={isDegraded ? "destructive" : "outline"}
              size="icon"
              className="size-8"
              aria-label={isDegraded ? "Restore connection" : "Simulate a source-system outage"}
              onClick={() => void toggle()}
            />
          }
        >
          {isDegraded ? <WifiOff className="size-4" /> : <Wifi className="size-4" />}
        </TooltipTrigger>
        <TooltipContent>{isDegraded ? "Degraded mode is on — click to restore" : "Simulate a source-system outage"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
