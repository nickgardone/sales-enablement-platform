"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { resetDemoData } from "@/lib/platform/admin-actions";

export type DataCounts = {
  rooftops: number;
  users: number;
  opportunities: number;
  auditEvents: number;
};

export function DataTab({ counts }: { counts: DataCounts }) {
  const [isPending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      try {
        await resetDemoData();
        toast.success("Demo data reset — you've been returned to the default persona.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reset demo data.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rooftops" value={counts.rooftops} />
        <StatCard label="Users" value={counts.users} />
        <StatCard label="Opportunities" value={counts.opportunities} />
        <StatCard label="Audit events" value={counts.auditEvents} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Reset demo data</CardTitle>
          <CardDescription>
            Clears every row and reseeds the deterministic synthetic dataset from scratch — the same data every
            time. Your persona selection resets to the default demo associate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={reset} disabled={isPending}>
            {isPending ? "Resetting..." : "Reset demo data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
