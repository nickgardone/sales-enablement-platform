"use client";

import { createContext, useContext, useRef, useState } from "react";
import { toast } from "sonner";
import { setDegradedMode as persistDegradedMode } from "@/lib/platform/degraded-mode-actions";

export type QueuedWrite = {
  id: string;
  label: string;
  queuedAt: string;
  run: () => Promise<void>;
};

type DegradedModeContextValue = {
  isDegraded: boolean;
  toggle: () => void;
  queue: QueuedWrite[];
  /** Runs immediately when online; queues (rather than running) while degraded. Returns whether it ran immediately. */
  enqueueOrRun: (label: string, run: () => Promise<void>) => Promise<boolean>;
  syncNow: () => Promise<void>;
};

const DegradedModeContext = createContext<DegradedModeContextValue | null>(null);

/**
 * Simulated-outage state for the host shell (spec Section 7): cached
 * last-known-good data stays visible (see MetricCard's staleness treatment),
 * and writes queue locally instead of hitting the server until the toggle
 * flips back off — a nod to real dealer-software outage risk, not a
 * production offline-first implementation. The queue is intentionally
 * in-memory only (lost on a hard reload), matching "simulates an outage,"
 * not "builds real offline sync."
 */
export function DegradedModeProvider({ initialDegraded, children }: { initialDegraded: boolean; children: React.ReactNode }) {
  const [isDegraded, setIsDegraded] = useState(initialDegraded);
  const [queue, setQueue] = useState<QueuedWrite[]>([]);
  const queueRef = useRef<QueuedWrite[]>([]);
  queueRef.current = queue;

  async function syncNow() {
    const items = queueRef.current;
    if (items.length === 0) return;
    setQueue([]);
    for (const item of items) {
      try {
        await item.run();
        toast.success(`Synced: ${item.label}`);
      } catch (e) {
        toast.error(`Failed to sync "${item.label}": ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  }

  async function toggle() {
    const next = !isDegraded;
    setIsDegraded(next);
    await persistDegradedMode(next);
    if (next) {
      toast.info("Degraded mode on — simulating a source-system outage. New writes will queue until it's back.");
    } else {
      await syncNow();
    }
  }

  async function enqueueOrRun(label: string, run: () => Promise<void>): Promise<boolean> {
    if (!isDegraded) {
      await run();
      return true;
    }
    const item: QueuedWrite = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label, queuedAt: new Date().toISOString(), run };
    setQueue((current) => [...current, item]);
    toast.message(`Queued: ${label}`, { description: "Will sync automatically once degraded mode is turned off." });
    return false;
  }

  return (
    <DegradedModeContext.Provider value={{ isDegraded, toggle, queue, enqueueOrRun, syncNow }}>{children}</DegradedModeContext.Provider>
  );
}

export function useDegradedMode() {
  const ctx = useContext(DegradedModeContext);
  if (!ctx) throw new Error("useDegradedMode must be used within a DegradedModeProvider");
  return ctx;
}
