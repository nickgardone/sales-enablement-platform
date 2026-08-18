"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearStip } from "@/lib/modules/closing-deals/actions";
import type { StipRow } from "@/lib/modules/closing-deals/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OUTSTANDING: "destructive",
  CLEARED: "secondary",
  WAIVED: "outline",
};

export function StipsPanel({ stips }: { stips: StipRow[] }) {
  const [isPending, startTransition] = useTransition();

  function onClear(stipId: string) {
    startTransition(async () => {
      try {
        await clearStip(stipId);
        toast.success("Stipulation cleared.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to clear stipulation.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Stipulations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stips.length === 0 && <p className="text-sm text-muted-foreground">No stipulations on this application.</p>}
        {stips.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.description}</span>
                <Badge variant={STATUS_VARIANT[s.status]} className="text-[10px]">
                  {s.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {s.ownerName} &middot; {s.status === "OUTSTANDING" ? `aging ${s.agingDays}d` : s.clearedAt ? `cleared ${new Date(s.clearedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
            {s.status === "OUTSTANDING" && (
              <Button size="sm" variant="outline" onClick={() => onClear(s.id)} disabled={isPending}>
                Clear
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
