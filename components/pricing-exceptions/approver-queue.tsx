"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { decideApprovalStep } from "@/lib/modules/pricing-exceptions/actions";
import type { ApproverQueueRow } from "@/lib/modules/pricing-exceptions/types";

const REQUEST_TYPE_LABEL: Record<string, string> = {
  RATE_EXCEPTION: "Rate exception",
  PROGRAM_TIER_CHANGE: "Program tier change",
  TERM_EXTENSION: "Term extension",
  FEE_WAIVER: "Fee waiver",
};

export function ApproverQueue({ rows, title = "Approver queue" }: { rows: ApproverQueueRow[]; title?: string }) {
  const [active, setActive] = useState<ApproverQueueRow | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [rationale, setRationale] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDecision(row: ApproverQueueRow, d: "APPROVED" | "REJECTED") {
    setActive(row);
    setDecision(d);
    setRationale("");
  }

  function submit() {
    if (!active || !decision) return;
    if (!rationale.trim()) {
      toast.error("A rationale is required.");
      return;
    }
    startTransition(async () => {
      try {
        await decideApprovalStep({
          exceptionRequestId: active.exceptionRequestId,
          approvalRequestId: active.approvalRequestId,
          stepId: active.stepId,
          decision,
          rationale: rationale.trim(),
        });
        toast.success(decision === "APPROVED" ? "Approved." : "Rejected.");
        setActive(null);
        setDecision(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to record decision.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription>Pending decisions routed to you, sorted by SLA risk.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting on you.</p>}
        {rows.map((r) => (
          <div key={r.stepId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.rooftopName}</span>
                <Badge variant="outline" className="text-[10px]">
                  {REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}
                </Badge>
                {r.isBreached && (
                  <Badge variant="destructive" className="text-[10px]">
                    SLA breached
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {r.dollarAmount ? `$${r.dollarAmount.toLocaleString()}` : "No amount"} &middot; {r.policyName} &middot; requested by{" "}
                {r.requestedByName} &middot; {formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openDecision(r, "REJECTED")}>
                Reject
              </Button>
              <Button size="sm" onClick={() => openDecision(r, "APPROVED")}>
                Approve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === "APPROVED" ? "Approve" : "Reject"} exception request</DialogTitle>
            <DialogDescription>
              {active?.rooftopName} &middot; {active?.dollarAmount ? `$${active.dollarAmount.toLocaleString()}` : "No amount"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Decision rationale — becomes part of the compliance record."
            />
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={isPending} variant={decision === "REJECTED" ? "destructive" : "default"}>
              {isPending ? "Saving..." : decision === "APPROVED" ? "Confirm approve" : "Confirm reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
