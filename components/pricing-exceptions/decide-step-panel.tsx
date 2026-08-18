"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { decideApprovalStep } from "@/lib/modules/pricing-exceptions/actions";

export function DecideStepPanel({
  exceptionRequestId,
  approvalRequestId,
  stepId,
  approverRole,
}: {
  exceptionRequestId: string;
  approvalRequestId: string;
  stepId: string;
  approverRole: string;
}) {
  const [rationale, setRationale] = useState("");
  const [isPending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    if (!rationale.trim()) {
      toast.error("A rationale is required.");
      return;
    }
    startTransition(async () => {
      try {
        await decideApprovalStep({ exceptionRequestId, approvalRequestId, stepId, decision, rationale: rationale.trim() });
        toast.success(decision === "APPROVED" ? "Approved." : "Rejected.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to record decision.");
      }
    });
  }

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Your decision</CardTitle>
        <CardDescription>This step is waiting on a {approverRole.replace("_", " ").toLowerCase()} decision.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Decision rationale — becomes part of the compliance record."
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => decide("REJECTED")} disabled={isPending}>
            Reject
          </Button>
          <Button onClick={() => decide("APPROVED")} disabled={isPending}>
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
