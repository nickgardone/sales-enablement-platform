"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { resolveEscalation } from "@/lib/modules/escalations/actions";
import type { EscalationRow } from "@/lib/modules/escalations/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "outline",
  IN_PROGRESS: "secondary",
  RESOLVED: "secondary",
};

export function EscalationsList({ rows }: { rows: EscalationRow[] }) {
  const [active, setActive] = useState<EscalationRow | null>(null);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitResolve() {
    if (!active) return;
    if (!notes.trim()) {
      toast.error("Add resolution notes.");
      return;
    }
    startTransition(async () => {
      try {
        await resolveEscalation(active.id, notes.trim());
        toast.success("Escalation resolved.");
        setActive(null);
        setNotes("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to resolve escalation.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link href={`/accounts/${r.rooftopId}`} className="text-sm font-medium hover:underline">
                  {r.rooftopName}
                </Link>
                <Badge variant="outline" className="text-[10px]">
                  {r.category}
                </Badge>
                <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px]">
                  {r.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.dealerGroupName}</p>
              <p className="text-sm">{r.description}</p>
              {r.resolutionNotes && <p className="text-xs text-muted-foreground">Resolution: {r.resolutionNotes}</p>}
              <p className="text-xs text-muted-foreground">
                Raised by {r.raisedByName} &middot; {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
              </p>
            </div>
            {r.status !== "RESOLVED" && (
              <Button size="sm" variant="outline" onClick={() => setActive(r)}>
                Resolve
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No escalations in scope.</p>}

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve escalation</DialogTitle>
            <DialogDescription>{active?.rooftopName}</DialogDescription>
          </DialogHeader>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How was this resolved?" />
          <DialogFooter>
            <Button onClick={submitResolve} disabled={isPending}>
              {isPending ? "Saving..." : "Mark resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
